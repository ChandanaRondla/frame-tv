import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import shaka from 'shaka-player';

const STREAM='https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd';
const STORAGE_KEY='frame-tv-sintel-progress';

function formatTime(value:number){
  if(!Number.isFinite(value))return '0:00';
  const seconds=Math.floor(value);
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}

function getSavedProgress(){
  try{
    const value=Number(localStorage.getItem(STORAGE_KEY)||0);
    return Number.isFinite(value)&&value>0?value:0;
  }catch{
    return 0;
  }
}

function saveProgress(value:number){
  try{
    if(Number.isFinite(value)&&value>0){
      localStorage.setItem(STORAGE_KEY,String(value));
    }
  }catch{
    // Playback still works when storage is unavailable.
  }
}

export default function DemoCinema({onClose}:{onClose:()=>void}){
  const videoRef=useRef<HTMLVideoElement>(null);
  const playerRef=useRef<shaka.Player|null>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const progressRef=useRef(0);
  const completedRef=useRef(false);

  const [status,setStatus]=useState('Preparing playback…');
  const [ready,setReady]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [buffering,setBuffering]=useState(false);
  const [current,setCurrent]=useState(0);
  const [duration,setDuration]=useState(0);
  const [captionsAvailable,setCaptionsAvailable]=useState(false);
  const [captionsEnabled,setCaptionsEnabled]=useState(false);
  const [savedPosition]=useState(getSavedProgress);

  useEffect(()=>{
    const video=videoRef.current;
    if(!video)return;
    const media:HTMLVideoElement=video;

    let cancelled=false;
    let player:shaka.Player|null=null;

    async function initialize(){
      try{
        shaka.polyfill.installAll();

        if(!shaka.Player.isBrowserSupported()){
          setStatus('This browser does not support adaptive streaming.');
          return;
        }

        player=new shaka.Player();
        playerRef.current=player;

        player.configure({
          preferredAudioLanguage:'en',
          preferredTextLanguage:'en'
        });

        player.addEventListener('error',(event)=>{
          if(cancelled)return;
          const detail=(event as unknown as {detail?:{code?:number}}).detail;
          setStatus(`Playback error: ${detail?.code??'unknown'}`);
        });

        player.addEventListener('buffering',(event)=>{
          if(cancelled)return;
          const data=event as unknown as {buffering?:boolean};
          setBuffering(Boolean(data.buffering));
        });

        await player.attach(media);
        await player.load(STREAM);

        if(cancelled)return;

        const tracks=player.getTextTracks();
        const hasEnglish=tracks.some(track=>track.language.toLowerCase().startsWith('en'));

        setCaptionsAvailable(hasEnglish);

        if(hasEnglish){
          const englishTrack=tracks.find(
            track=>track.language.toLowerCase().startsWith('en')
          );
          if(englishTrack)player.selectTextTrack(englishTrack);
        }

        player.selectTextTrack(null);

        const saved=getSavedProgress();
        if(saved>0 && Number.isFinite(media.duration) && saved<media.duration-10){
          media.currentTime=saved;
          progressRef.current=saved;
          setCurrent(saved);
        }

        setDuration(Number.isFinite(media.duration)?media.duration:0);
        setReady(true);
        setStatus('Ready to play');
        closeRef.current?.focus();
      }catch(error){
        if(!cancelled)setStatus(`Unable to load video: ${String(error)}`);
      }
    }

    void initialize();

    return ()=>{
      cancelled=true;
      if(!completedRef.current){
        saveProgress(progressRef.current);
      }
      playerRef.current=null;
      if(player)void player.destroy();
    };
  },[]);

  useEffect(()=>{
    if(!ready)return;

    const interval=window.setInterval(()=>{
      const video=videoRef.current;
      if(video&&!completedRef.current&&video.currentTime>0){
        saveProgress(video.currentTime);
      }
    },5000);

    return()=>window.clearInterval(interval);
  },[ready]);

  function togglePlayback(){
    const video=videoRef.current;
    if(!video||!ready)return;

    if(video.paused){
      void video.play().catch(()=>{
        setStatus('Playback could not start. Please try again.');
      });
    }else{
      video.pause();
    }
  }

  function seek(seconds:number){
    const video=videoRef.current;
    if(!video||!ready||!Number.isFinite(video.duration))return;

    video.currentTime=Math.max(
      0,
      Math.min(video.duration,video.currentTime+seconds)
    );
  }

  function toggleCaptions(){
    const player=playerRef.current;
    if(!player||!captionsAvailable)return;

    const next=!captionsEnabled;

    if(next){
      const englishTrack=player.getTextTracks().find(
        track=>track.language.toLowerCase().startsWith('en')
      );
      if(englishTrack)player.selectTextTrack(englishTrack);
    }
    if(!next)player.selectTextTrack(null);
    setCaptionsEnabled(next);
  }

  function handleClose(){
    const video=videoRef.current;
    if(video){
      video.pause();
      if(!completedRef.current)saveProgress(video.currentTime);
    }
    onClose();
  }

  function handleKeyDown(event:KeyboardEvent<HTMLDivElement>){
    if(event.key==='Escape'){
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    }else if(event.key==='ArrowLeft'){
      event.preventDefault();
      event.stopPropagation();
      seek(-10);
    }else if(event.key==='ArrowRight'){
      event.preventDefault();
      event.stopPropagation();
      seek(10);
    }else if(event.key===' '){
      if(event.target instanceof HTMLButtonElement)return;
      event.preventDefault();
      event.stopPropagation();
      togglePlayback();
    }else if(event.key.toLowerCase()==='c'){
      event.preventDefault();
      event.stopPropagation();
      toggleCaptions();
    }
  }

  return (
    <div
      className="cinema-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sintel video player"
      onKeyDown={handleKeyDown}
    >
      <section className="cinema-panel">
        <div className="cinema-top">
          <div>
            <p className="eyebrow">FRAME / TV · NOW PLAYING</p>
            <h2>Sintel</h2>
            <p className="metadata">
              English · Adaptive MPEG-DASH · Shaka Player
            </p>
          </div>
          <button
            ref={closeRef}
            className="exit"
            onClick={handleClose}
          >
            Close ×
          </button>
        </div>

        <div className="cinema-screen">
          <video
            ref={videoRef}
            playsInline
            preload="metadata"
            onPlay={()=>setPlaying(true)}
            onPause={()=>setPlaying(false)}
            onWaiting={()=>setBuffering(true)}
            onPlaying={()=>setBuffering(false)}
            onLoadedMetadata={event=>{
              setDuration(event.currentTarget.duration);
            }}
            onTimeUpdate={event=>{
              const video=event.currentTarget;
              const time=video.currentTime;
              progressRef.current=time;
              setCurrent(time);
            }}
            onEnded={()=>{
              completedRef.current=true;
              progressRef.current=0;
              setPlaying(false);
              try{localStorage.removeItem(STORAGE_KEY)}catch{}
              setStatus('Finished watching');
            }}
          />
          {buffering&&<div className="cinema-buffering">Buffering…</div>}
        </div>

        <div className="cinema-controls">
          <button
            className="primary"
            disabled={!ready}
            onClick={togglePlayback}
          >
            {playing?'Pause':'Play / Resume'}
          </button>

          <button disabled={!ready} onClick={()=>seek(-10)}>
            −10s
          </button>

          <button disabled={!ready} onClick={()=>seek(10)}>
            +10s
          </button>

          <button
            disabled={!ready||!captionsAvailable}
            aria-pressed={captionsEnabled}
            onClick={toggleCaptions}
          >
            CC {captionsEnabled?'On':'Off'}
          </button>

          <span className="cinema-time">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>

        <input
          className="cinema-progress"
          type="range"
          min={0}
          max={Number.isFinite(duration)&&duration>0?duration:0}
          value={Math.min(current,Number.isFinite(duration)?duration:0)}
          disabled={!ready}
          aria-label="Playback position"
          onChange={event=>{
            const video=videoRef.current;
            if(video){
              video.currentTime=Number(event.target.value);
              progressRef.current=video.currentTime;
              setCurrent(video.currentTime);
            }
          }}
        />

        {savedPosition>0&&(
          <p className="cinema-resume-note">
            Continue Watching · Saved at {formatTime(savedPosition)}
          </p>
        )}

        <p className="metadata" role="status">
          {status}
          {ready&&!captionsAvailable?' · No English subtitle track detected':''}
        </p>

        <p className="cinema-help">
          Left/Right: seek · Space: pause/resume · C: captions · Escape: close
        </p>
      </section>
    </div>
  );
}
