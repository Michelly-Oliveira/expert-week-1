class VideoPlayer {
	constructor({ manifestJson, network }) {
		this.manifestJson = manifestJson;
		this.network = network;
		this.videoComponent = null;
		this.sourceBuffer = null;
		this.selected = {};
		this.videoDuration = 0;
	}

	initializeCodec() {
		this.videoElement = document.querySelector('#vid');

		const isMediaSourceSupported = !!window.MediaSource;

		if (!isMediaSourceSupported) {
			alert('Your browser or OS does not support MSE!');
			return;
		}

		const isCodecSupported = MediaSource.isTypeSupported(this.manifestJson.codec);

		if (!isCodecSupported) {
			alert(`Your browser or OS does not support the codec ${this.manifestJson.codec}`);
			return;
		}

		// update html src on demand - no need to modify/replace the variable
		const mediaSource = new MediaSource();
		this.videoElement.src = URL.createObjectURL(mediaSource);

		// when html element is ready to be used
		mediaSource.addEventListener('sourceopen', this.sourceOpenWrapper(mediaSource));
	}

	sourceOpenWrapper(mediaSource) {
		return async _ => {
			this.sourceBuffer = mediaSource.addSourceBuffer(this.manifestJson.codec);
			// always start with the intro
			const selected = (this.selected = this.manifestJson.intro);

			// show duration (of not set, shows LIVE)
			mediaSource.duration = this.videoDuration;

			await this.fileDownload(selected.url);
		};
	}

	async fileDownload(url) {
		const preprareUrl = {
			url,
			fileResolution: 360,
			fileResolutionTag: this.manifestJson.fileResolutionTag,
			hostTag: this.manifestJson.hostTag,
		};

		const finalUrl = this.network.parseManifestUrl(preprareUrl);
		this.setVideoPlayerDuration(finalUrl);

		const data = await this.network.fetchFile(finalUrl);

		return this.processBufferSegments(data);
	}

	setVideoPlayerDuration(finalUrl) {
		const bars = finalUrl.split('/');
		const [name, videoDuration] = bars[bars.length - 1].split('-');

		this.videoDuration += videoDuration;
	}

	async processBufferSegments(allSegments) {
		const sourceBuffer = this.sourceBuffer;
		sourceBuffer.appendBuffer(allSegments);

		return new Promise((resolve, reject) => {
			const updateEnd = _ => {
				sourceBuffer.removeEventListener('updateend', updateEnd);
				sourceBuffer.timestampOffset = this.videoDuration;

				return resolve();
			};

			sourceBuffer.addEventListener('updateend', updateEnd);
			sourceBuffer.addEventListener('error', reject);
		});
	}
}
