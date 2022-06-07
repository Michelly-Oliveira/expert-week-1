const MANIFEST_URL = 'manifest.json';
const localhost = ['127.0.0.1', 'localhost'];

async function main() {
	const isLocalHost = !!~localhost.indexOf(window.location.hostname);
	const manifestJson = await (await fetch(MANIFEST_URL)).json();
	const host = isLocalHost ? manifestJson.localhost : manifestJson.productionHost;

	const videoComponent = new VideoComponent();
	const network = new Network({ host });
	const videoPlayer = new VideoPlayer({
		manifestJson,
		network,
	});

	videoPlayer.initializeCodec();
	videoComponent.initializePlayer();
}

window.onload = main;
