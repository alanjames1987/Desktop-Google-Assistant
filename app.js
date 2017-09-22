var $ = require('jquery');
var electron = require('electron');
var fs = require('fs');
var record = require('node-record-lpcm16');
var tou8 = require('buffer-to-uint8array');

var GoogleAssistant = require('google-assistant');
var Speaker = require('speaker');
var Dialogs = require('dialogs');

var dialog = new Dialogs();

var ipcRenderer = electron.ipcRenderer;

ipcRenderer.send('register');

var config = {
	auth: {
		keyFilePath: __dirname + '/keys/key.json',
		savedTokensPath: __dirname + '/tokens/tokens.js',
		tokenInput: function(callback) {
			dialog.prompt('Please provide your OAuth token.', function(value) {
				callback(value);
				intro();
			});
		},
	},
	mic: {
		threshold: 0,
		// device: 'hw:2',
	},
	speaker: {
		encodingIn: 'LINEAR16',
		sampleRateOut: 24000,
	},
};

function intro() {

	var introText = [
		"Hello, I'm your Desktop Google Assistant.",
		"You can talk to me by clicking the mic icon below or pressing CRTL+Space.",
		"I can't do everything that a Google Home can do, but I can still do a lot. Try asking &quot;what can you do&quot; to learn more.",
	];

	for (var i = 0, j = introText.length; i < j; i++) {
		(function(i) {
			setTimeout(function() {
				insertResponse(introText[i]);
			}, 2000 * i);
		})(i);
	}

}

function insertTranscription(value) {
	$('.conversation').append('<p class="transcription">' + value + '</p>');
	$('.conversation').animate({
		scrollTop: $('.conversation')[0].scrollHeight,
	}, 1000);
}

function insertResponse(value) {
	$('.conversation').append('<p class="response">' + value + '</p>');
	$('.conversation').animate({
		scrollTop: $('.conversation')[0].scrollHeight,
	}, 1000);
}

var assistant = new GoogleAssistant(config);

$('.mic').addClass('ready');

ipcRenderer.on('shortcut', function() {
	console.log('shortcut click');
	assistant.start();
});

$('.mic').click(function() {
	console.log('mic click');
	assistant.start();
});

$('.conversation').animate({
	scrollTop: $('.conversation')[0].scrollHeight,
}, 1000);

var started = false;

assistant
	.on('ready', function() {

		console.log('assistant ready');

		$('.assistant').addClass('ready');

	})
	.on('started', function(conversation) {

		console.log('assistant started');

		if (started) {
			return;
		}

		started = true;

		document.querySelector('#ping').play();

		$('.mic').show();
		$('.assistant').hide();

		var mic = record.start(config.mic);

		mic.on('data', function(data) {

			console.log('mic data');

			var a = tou8(data);

			conversation.write(a);

		});

		var speaker = new Speaker({
			channels: 1,
			sampleRate: config.speaker.sampleRateOut,
		});

		speaker.opened = null;
		speaker.spokenResponseLength = 0;
		speaker.buffer = [];
		speaker.timer = null;

		speaker.play = function(data, callback) {

			try {

				speaker.spokenResponseLength += data.length;

				speaker.write(data);

				var now = new Date().getTime();

				var audioTime = speaker.spokenResponseLength / (config.speaker.sampleRateOut * 16 / 8) * 1000;

				try {
					clearTimeout(speaker.timer);
				} catch (e) {}

				speaker.timer = setTimeout(function() {
					speaker.end();
					callback();
				}, audioTime - Math.max(0, now - speaker.opened));

			} catch (e) {
				callback();
			}

		};

		speaker
			.on('open', function() {
				console.log('speaker open');
				speaker.buffer = [];
				speaker.opened = new Date().getTime();
				speaker.spokenResponseLength = 0.1;
			})
			.on('flush', function() {
				console.log('speaker flush');
				speaker.buffer = [];
			})
			.on('close', function() {
				console.log('speaker close');
			});

		conversation
			.on('end-of-utterance', function() {

				console.log('conversation end-of-utterance');

				$('.mic').hide();
				$('.assistant').show();

				record.stop();

			})
			.on('transcription', function(text) {

				console.log('conversation transcription:', text);

				insertTranscription(text);

			})
			.on('audio-data', function(data, test) {

				console.log('conversation audio-data');

				speaker.play(data, function() {
					conversation.end();
				});

			})
			.on('ended', function(error, continueConversation) {

				console.log('conversation ended');

				$('.mic').show();
				$('.assistant').hide();

				if (error) {
					console.log('conversation ended error:', error);
					return;
				}

				if (continueConversation) {
					console.log('conversation continued');
					started = false;
					assistant.start();
					return;
				}

				console.log('conversation complete');

				started = false;

			})
			.on('error', function(error) {
				console.log('conversation error:', error);
				started = false;
				insertResponse('I encountered an error.');
			});

	})
	.on('error', function(error) {
		console.log('assistant error:', error);
		started = false;
		insertResponse('I encountered an error.');
	});