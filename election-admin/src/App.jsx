import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const JsonFileUpload = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedData, setUploadedData] = useState([]);
  const wsRef = useRef(null);
  const [detectedType, setDetectedType] = useState(null); // PV, PD, ED

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:3001');

    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);
    wsRef.current.onerror = () => setError('Connection failed');

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'upload_success') {
        setSuccess(`${data.resultType} data uploaded successfully for ${data.districtName}!`);
        setUploadedData((prev) => [...prev, data.uploadedData]);
        setDetectedType(data.resultType);
      } else if (data.type === 'error') {
        setError(data.message);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  const detectResultType = (jsonData) => {
    // Electoral district
    if (jsonData.level === 'ELECTORAL-DISTRICT') {
      return 'ED';
    }

    // Polling division
    if (jsonData.level === 'POLLING-DIVISION') {
      return 'PD';
    }
    
    // Postal votes
    if (jsonData.level === 'POSTAL-VOTE') {
      return 'PV';
    }
    
    // Default
    return 'UNKNOWN';
  };

  const handleFileUpload = (event) => {
    const files = event.target.files; //
    if (!files.length) return;

    Array.from(files).forEach((file) => { 
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        setError('Please select a JSON file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          const resultType = detectResultType(jsonData);
          
          setDetectedType(resultType);
          
          wsRef.current.send(JSON.stringify({
            type: 'election_data_upload',
            fileName: file.name,
            jsonData,
            resultType
          }));
          setError('');
          setSuccess('');
        } catch {
          setError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className='container'>
      <h2>Election Data Upload</h2>
      
      <div className='status'>
        Status: {connected ? '✅ Connected' : '❌ Disconnected'}
      </div>

      {detectedType && (
        <div className='status'>
          Detected Type: {detectedType} - {detectedType === 'PV' ? 'Postal Votes' : detectedType === 'PD' ? 'Polling Division' : detectedType === 'ED' ? 'Electoral District (Final)' : 'Unknown Type'}
        </div>
      )}

      <input
        type="file"
        accept=".json"
        multiple 
        onChange={handleFileUpload}
        disabled={!connected}
        className='file-input'
      />

      {error && <div className='error'>{error}</div>}
      {success && <div className='success'>{success}</div>}

      {uploadedData.length > 0 && (
        <div className='uploaded-data'>
          <h3>Uploaded Files</h3>
          {uploadedData.map((data, index) => (
            <div key={index} className='uploaded-file'>
              <h4>Uploaded: {data.ed_name || data.pd_name || 'Unknown'}</h4>
              <p>Type: {detectedType} - {detectedType === 'PV' ? 'Postal Votes' : detectedType === 'PD' ? 'Polling Division' : detectedType === 'ED' ? 'Electoral District (Final)' : 'Unknown Type'}</p>
              <p>Code: {data.ed_code || data.pd_code}</p>
              <p>Valid Votes: {data.summary?.valid?.toLocaleString()}</p>
              <p>Rejected Votes: {data.summary?.rejected?.toLocaleString()}</p>
              <p>Total Polled: {data.summary?.polled?.toLocaleString()}</p>
              <p>Percent Polled: {data.summary?.percent_polled}%</p>
              <p>Parties: {data.by_party?.length}</p>

              <div className='party-results'>
                <h4>Party Results:</h4>
                <ul>
                  {data.by_party?.map((party) => (
                    <li key={party.party_name}>
                      {party.candidate}: {party.votes.toLocaleString()} votes ({party.percentage}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JsonFileUpload;
