class VideoPlayer {
	constructor({ manifestJson, network, videoComponent }) {
		this.manifestJson = manifestJson;
		this.network = network;
		this.videoComponent = videoComponent;

		this.sourceBuffer = null;
		this.activeModalVideo = {};
		this.selected = {};
		this.videoDuration = 0;
		this.selections = [];
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
			setInterval(this.waitForQuestions.bind(this), 200);
		};
	}

	waitForQuestions() {
		const currentTime = parseInt(this.videoElement.currentTime);
		const shouldShowOptions = this.selected.at === currentTime;

		if (!shouldShowOptions) {
			return;
		}

		// don't show the modal more than once for each video
		if (this.activeModalVideo.url === this.selected.url) {
			return;
		}

		this.videoComponent.configureModal(this.selected.options);
		this.activeModalVideo = this.selected;
	}

	// calculate time it takes to download the smallest file on lowest resolution
	// use this as a base to get the best resolution based on internet speed
	async currentFileResolution() {
		const LOWEST_RESOLUTION = 144;
		const preprareUrl = {
			url: this.manifestJson.finalizar.url,
			fileResolution: LOWEST_RESOLUTION,
			fileResolutionTag: this.manifestJson.fileResolutionTag,
			hostTag: this.manifestJson.hostTag,
		};

		const url = this.network.parseManifestUrl(preprareUrl);

		return this.network.getProperResolution(url);
	}

	async nextChunk(data) {
		const key = data.toLowerCase();
		const selected = this.manifestJson[key];

		this.selected = {
			...selected,
			// adjust the time that the modal will be visible (based on the current time)
			at: parseInt(this.videoElement.currentTime + selected.at),
		};

		this.manageLag(selected);
		// continue video while downloading more content
		this.videoElement.play();
		await this.fileDownload(selected.url);
	}

	manageLag(selected) {
		// if we are selecting a video again (more than one time)
		if (!!~this.selections.indexOf(selected.url)) {
			// add 5 seconds to the duration
			// to give some extra time to compensate for the request time
			selected.at += 5;
			return;
		}

		this.selections.push(selected.url);
	}

	async fileDownload(url) {
		const fileResolution = await this.currentFileResolution();
		const preprareUrl = {
			url,
			fileResolution,
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

		this.videoDuration += parseFloat(videoDuration);
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
