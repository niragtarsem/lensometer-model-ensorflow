import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { BaseUrl, customerToken } from '@/components/constants';
import '../styles/styles.css';
import { AudioOutlined, SoundFilled } from '@ant-design/icons';
const Voice = ({ text, record, detail }) => {
  const audioPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState('');

  const updateAudioPlayer = (audioBlob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.load();
      var text_language = localStorage.getItem("text_language");
      if(text_language ==2){
        audioPlayerRef.current.volume = 1;
        audioPlayerRef.current.playbackRate = 0.8;
      }
      else{
        audioPlayerRef.current.volume = 1;
        audioPlayerRef.current.playbackRate = 0.95;
      }
      
    }
  };

  const fetchData = async () => {
    try {
      var text_language = localStorage.getItem("text_language");
      if (text_language === null) {
        text_language = "2"; // Default value
       }
      const language_response = await axios.get(`${BaseUrl}/speach-text-list-for-users/?page=${text}&text_language=${text_language}`, {
        headers: {
          Authorization: customerToken,
        },
      });
      if(language_response.data.status==200){
        let language_text = language_response.data.data[0].text
        const response = await axios.get(`${BaseUrl}/text-to-speech-api/?text=${language_text}&language=${text_language}`, {
          headers: {
            Authorization: customerToken,
          },
          responseType: 'blob',
        });
  
        if (response.data) {
          updateAudioPlayer(response.data);
          setCurrentText(text); // Update the current text
          return true; // Indicate that the data was fetched successfully
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    }

    return false; // Indicate that there was an error fetching the data
  };

  const playAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Error playing audio:', error);
        // Handle the error, e.g., show a user-friendly message
      });
    }
  };

  useEffect(() => {
    const fetchDataAndPlay = async () => {
      const dataFetched = await fetchData();
      if (dataFetched) {
        // Set up event listener for when audio is ready to play
        audioPlayerRef.current.addEventListener('canplaythrough', playAudio);
      }
    };

    fetchDataAndPlay();

    // Clean up resources on unmount
    return () => {
      // Remove event listener to avoid memory leaks
      if (audioPlayerRef.current) {
        audioPlayerRef.current.removeEventListener('canplaythrough', playAudio);
        // Pause or stop the audio playback
        audioPlayerRef.current.pause();
      }
    };
  }, [text, customerToken]);

  // Reset isPlaying state when text changes
  useEffect(() => {
    setIsPlaying(false);
  }, [text]);

  useEffect(() => {
    if(record){
      playAudio()
    }
    
  }, [record]);

  useEffect(() => {
    if(isPlaying==false){
      if(detail){
        detail(false)
      }
    }
    if(isPlaying==true){
      if(detail){
        detail(true)
      }
    }
    
  }, [isPlaying, detail]);

  return (
    <div className='voice-record-sec' style={{ display: 'none' }}>
      {/* <AudioOutlined onClick={playAudio} disabled={isPlaying} style={{ fontSize: '24px' }}> {isPlaying ? 'Playing...' : 'Play Audio'}</AudioOutlined> */}
     <div className='audio-icon-wrap'>
     <SoundFilled onClick={playAudio} disabled={isPlaying} style={{ fontSize: '24px' }}> {isPlaying ? 'Playing...' : 'Play Audio'}</SoundFilled>
     <span>Replay Audio</span>
     </div>
      <audio ref={audioPlayerRef} onEnded={() => setIsPlaying(false)}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default Voice;
