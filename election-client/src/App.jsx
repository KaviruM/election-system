import React, { useState, useEffect, useRef } from 'react';

const ElectoralDataViewer = () => {
  const [connected, setConnected] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [selected, setSelected] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:3001');

    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'initial_data' || data.type === 'update') {
        setDistricts(data.data);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  if (!connected) {
    return <div style={{ padding: '20px' }}>Connecting to server...</div>;
  }

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h2>Districts ({districts.length})</h2>
        {districts.map((district) => (
          <div
            key={district.ed_code}
            onClick={() => setSelected(district)}
            style={{
              padding: '10px',
              margin: '5px 0',
              border: '1px solid #000000ff',
              cursor: 'pointer',
              backgroundColor: selected?.ed_code === district.ed_code ? '#0073c5ff' : '#000000ff'
            }}
          >
            <strong>{district.ed_name}</strong>
            <div>Code: {district.ed_code}</div>
            <div>Turnout: {district.summary?.percent_polled}%</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 2 }}>
        {selected ? (
          <div>
            <h2>{selected.ed_name}</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>Summary</h3>
              <p>Valid Votes: {selected.summary?.valid?.toLocaleString()}</p>
              <p>Total Polled: {selected.summary?.polled?.toLocaleString()}</p>
              <p>Turnout: {selected.summary?.percent_polled}%</p>
            </div>

            <div>
              <h3>Top Candidates</h3>
              <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#000000ff' }}>
                    <th style={{ padding: '8px' }}>Candidate</th>
                    <th style={{ padding: '8px' }}>Party</th>
                    <th style={{ padding: '8px' }}>Votes</th>
                    <th style={{ padding: '8px' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.by_party?.slice(0, 5).map((party, i) => (
                    <tr key={i} style={{ backgroundColor: '#000000ff' }}> 
                      <td style={{ padding: '8px' }}>{party.candidate}</td>
                      <td style={{ padding: '8px' }}>{party.party_name}</td>
                      <td style={{ padding: '8px' }}>{party.votes?.toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>{party.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '100px', color: '#666' }}>
            Select a district to view details
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectoralDataViewer;