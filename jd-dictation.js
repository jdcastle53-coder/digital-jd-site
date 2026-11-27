(() => {
  async function authHeaders(path, body) {
    if (document.documentElement.dataset.executiveBeta) {
      const { signedBetaHeaders } = await import('/executive-beta-device.mjs');
      return { 'Content-Type': 'application/json', 'X-DJD-Executive-Beta': '1', ...await signedBetaHeaders(path, body) };
    }
    const { data } = await window.Auth.client.auth.getSession();
    const token = data?.session?.access_token;
    return { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) };
  }
    let dictation = null;

    function stopDictation(discard = false) {
      dictation?.stop(discard);
    }

    function connectLiveDictation(stream, update) {
      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel('oai-events');
      const controller = new AbortController();
      const segments = new Map();
      const order = [];
      let closed = false, failed = false, pendingCommits = 0, interval, startedAt, resolveFinal;
      let resolveReady;
      const ready = new Promise(resolve => { resolveReady = resolve; });
      const startup = setTimeout(fail, 4500);

      function close() {
        if (closed) return;
        closed = true;
        clearTimeout(startup);
        clearInterval(interval);
        controller.abort();
        channel.close();
        peer.close();
        resolveReady(false);
      }

      function fail() {
        failed = true;
        resolveFinal?.('');
        close();
      }

      function transcript() {
        return order.map(id => segments.get(id)?.text || '').filter(Boolean).join(' ');
      }

      function completeIfReady() {
        if (!pendingCommits && order.every(id => segments.get(id)?.done)) resolveFinal?.(transcript());
      }

      function commit() {
        if (closed || channel.readyState !== 'open') return false;
        pendingCommits++;
        try {
          channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          return true;
        } catch {
          fail();
          return false;
        }
      }

      channel.addEventListener('open', () => {
        if (closed) return;
        clearTimeout(startup);
        startedAt = Date.now();
        resolveReady(true);
        interval = setInterval(commit, 2500);
      });
      channel.addEventListener('close', () => { if (!closed) fail(); });
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'failed') fail();
      });
      channel.addEventListener('message', ({ data }) => {
        if (closed) return;
        let event;
        try { event = JSON.parse(data); } catch { return; }
        if (event.type === 'error' || event.type === 'conversation.item.input_audio_transcription.failed') {
          fail();
          return;
        }
        if (event.type === 'input_audio_buffer.committed') {
          pendingCommits = Math.max(0, pendingCommits - 1);
          if (!order.includes(event.item_id)) order.push(event.item_id);
        } else if (event.type === 'conversation.item.input_audio_transcription.delta' ||
                   event.type === 'conversation.item.input_audio_transcription.completed') {
          const previous = segments.get(event.item_id);
          if (previous?.done) return;
          const done = event.type.endsWith('.completed');
          segments.set(event.item_id, {
            text: done ? event.transcript : (previous?.text || '') + event.delta,
            done
          });
          if (!order.includes(event.item_id)) order.push(event.item_id);
          update(transcript());
        }
        completeIfReady();
      });

      (async () => {
        try {
          stream.getAudioTracks().forEach(track => peer.addTrack(track, stream));
          await peer.setLocalDescription(await peer.createOffer());
          const body = { sdp: peer.localDescription.sdp };
          const response = await fetch('/api/live-transcription', {
            method: 'POST',
            headers: await authHeaders('/api/live-transcription', body),
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Live transcription unavailable');
          const { sdp } = await response.json();
          if (!closed) await peer.setRemoteDescription({ type: 'answer', sdp });
        } catch {
          if (!closed) fail();
        }
      })();

      return {
        ready, close,
        async finish() {
          if (closed || failed || !startedAt) return '';
          clearInterval(interval);
          // Let the last packets reach the server before committing the tail.
          await new Promise(resolve => setTimeout(resolve, 180));
          if (closed || !commit()) return '';
          const final = await new Promise(resolve => {
            const timer = setTimeout(() => resolve(''), 650);
            resolveFinal = value => { clearTimeout(timer); resolve(value); };
            completeIfReady();
          });
          close();
          return final;
        }
      };
    }

    function attachFieldDictation(button, input, composer = false) {
      const idleText = button.textContent;
      const idleLabel = composer ? 'Dictate' : 'Dictate your answer';
      button.title = 'Record up to 30 seconds and send the audio to OpenAI for transcription.';
      button.setAttribute('aria-pressed', 'false');

      button.addEventListener('click', async () => {
        if (dictation) {
          if (dictation.button === button) stopDictation();
          else alert('Finish the current dictation before using another microphone.');
          return;
        }
        const mimeType = window.MediaRecorder && ['audio/webm;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
        if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
          alert('Recording is unavailable in this browser. Try Chrome or type your answer.');
          return;
        }

        const chunks = [];
        const upload = new AbortController();
        let stream, recorder, timer, live;
        let liveCoversStart = false;
        const initialText = input.value.trim();
        let lastValue = input.value;
        function putText(text) {
          if (!text || !input.isConnected || input.disabled || input.value !== lastValue) return;
          lastValue = [initialText, text.trim()].filter(Boolean).join(' ');
          input.value = lastValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        let discarded = false;
        let stopped = false;
        const session = { button, stop };
        dictation = session;

        function status(text, label) {
          button.textContent = text;
          button.setAttribute('aria-label', label || text);
        }

        function finish() {
          if (dictation !== session) return;
          clearTimeout(timer);
          live?.close();
          stream?.getTracks().forEach(track => track.stop());
          status(idleText, idleLabel);
          button.classList.remove('is-listening');
          button.setAttribute('aria-pressed', 'false');
          dictation = null;
        }

        function stop(discard) {
          if (discard) {
            discarded = true;
            upload.abort();
          }
          if (stopped && !discard) return;
          stopped = true;
          clearTimeout(timer);
          if (recorder?.state === 'recording') {
            try {
              recorder.stop();
            } catch {
              if (!discarded) alert('Could not finish recording. Try again.');
              finish();
            } finally {
              stream.getTracks().forEach(track => track.stop());
            }
          }
          if (discard || !recorder) finish();
        }

        async function transcribe() {
          if (discarded || dictation !== session) return;
          clearTimeout(timer);
          stream.getTracks().forEach(track => track.stop());
          status('Transcribing...', 'Transcribing recording');
          button.classList.remove('is-listening');
          button.setAttribute('aria-pressed', 'false');
          try {
            const final = liveCoversStart ? await live?.finish() : '';
            live?.close();
            if (discarded) return;
            if (final) {
              putText(final);
              return;
            }
            const audio = new Blob(chunks, { type: mimeType });
            if (!audio.size) throw new Error('No audio was recorded. Try again.');
            if (audio.size > 1024 * 1024) throw new Error('The recording is too large. Try a shorter clip.');
            const audioBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(audio);
            });
            const body = { audio: audioBase64, mimeType };
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: await authHeaders('/api/transcribe', body),
              body: JSON.stringify(body),
              signal: upload.signal
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not transcribe the recording.');
            if (!discarded) putText(data.text);
          } catch (error) {
            if (!discarded) alert(error.message || 'Could not transcribe the recording.');
          } finally {
            finish();
          }
        }

        status('Connecting...', 'Requesting microphone access');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (stopped || dictation !== session) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
          recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
          recorder.onstop = transcribe;
          recorder.onerror = () => {
            if (!discarded && dictation === session) alert('Recording failed. Check the microphone and try again.');
            stop(true);
          };
          recorder.start();
          if (window.RTCPeerConnection) {
            try {
              const recordingStartedAt = performance.now();
              live = connectLiveDictation(stream, putText);
              live.ready.then(ready => {
                // Finalize from the full recording if the connection missed the start.
                liveCoversStart = ready && performance.now() - recordingStartedAt < 200;
              });
            } catch {
              live?.close();
            }
          }
          status(composer ? 'Stop recording' : 'Stop', 'Stop recording and transcribe');
          button.classList.add('is-listening');
          button.setAttribute('aria-pressed', 'true');
          timer = setTimeout(() => stop(false), 30000);
        } catch (error) {
          if (!stopped) {
            alert(error.name === 'NotAllowedError'
              ? 'Allow microphone access for this site, then try again.'
              : 'Could not start microphone recording. Check your microphone and try again.');
          }
          finish();
        }
      });
    }

  window.JDDictation = { attach: attachFieldDictation, stop: stopDictation };
})();
