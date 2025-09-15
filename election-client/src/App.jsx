import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const ElectoralDataViewer = () => {
  const [connected, setConnected] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalView, setTotalView] = useState('island'); // island or district
  const wsRef = useRef(null);

  // Calculate totals
  const calculateTotals = () => {
    // district total calculation
    if (totalView === 'district' && selected) {
      return {
        validVotes: selected.summary?.valid || 0,
        rejectedVotes: selected.summary?.rejected || 0,
        totalPolled: selected.summary?.polled || 0,
        percentPolled: selected.summary?.percent_polled || 0
      };
    } else {
      // Island total calculation
      const totals = districts.reduce((acc, district) => {
        acc.validVotes += district.summary?.valid || 0;
        acc.rejectedVotes += district.summary?.rejected || 0;
        acc.totalPolled += district.summary?.polled || 0;
        return acc;
      }, {
        totalVoters: 0,
        validVotes: 0,
        rejectedVotes: 0,
        totalPolled: 0
      });
      
      totals.percentPolled = totals.totalVoters > 0 ? 
        ((totals.totalPolled / totals.totalVoters) * 100).toFixed(2) : 0;
      
      return totals;
    }
  };

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:3001");

    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "initial_data" || data.type === "update") {
        setDistricts(data.data);
        const total = data.data.reduce((sum, district) => sum + district.summary?.valid || 0, 0);
        setTotalVotes(total);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  if (!connected) {
    return <div className="connection">Connecting to server...</div>;
  }

  const totals = calculateTotals();

  return (
    <div className="container">
      {/* Totals Section */}
      <div className="totals-section">
        <div className="totals-header">
          <h2>Electoral Results</h2>
          <div className="total-buttons">
            <button 
              className={`total-btn ${totalView === 'island' ? 'active' : ''}`}
              onClick={() => setTotalView('island')}
            >
              Island Totals
            </button>
            <button 
              className={`total-btn ${totalView === 'district' ? 'active' : ''}`}
              onClick={() => setTotalView('district')}
              disabled={!selected}
            >
              District Totals
            </button>
          </div>
        </div>
        
        <div className="totals-cards">
          <div className="total-card">
            <div className="total-label">Valid Votes</div>
            <div className="total-value">{totals.validVotes.toLocaleString()}</div>
          </div>
          <div className="total-card">
            <div className="total-label">Rejected Votes</div>
            <div className="total-value">{totals.rejectedVotes.toLocaleString()}</div>
          </div>
          <div className="total-card">
            <div className="total-label">Total Polled</div>
            <div className="total-value">{totals.totalPolled.toLocaleString()}</div>
          </div>
          <div className="total-card">
            <div className="total-label">Percent Polled</div>
            <div className="total-value">{totals.percentPolled}%</div>
          </div>
        </div>
      </div>


      <div className="main-content">
        <div className="districts">
          <h2>Districts ({districts.length})</h2>
          {districts.map((district) => (
            <div
              key={district.ed_code}
              onClick={() => setSelected(district)}
              className="district"
            >
              <strong>{district.ed_name}</strong>
              <div>Code: {district.ed_code}</div>
              <div>Turnout: {district.summary?.percent_polled}%</div>
            </div>
          ))}
        </div>

        <div className="charts">
          {selected ? (
            <div>
              <h2>{selected.ed_name}</h2>
              <div>Code: {selected.ed_code}</div>
              <div>Turnout: {selected.summary?.percent_polled}%</div>
              
              <div className="details">
                <h3>Summary</h3>
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="summary-label">Valid Votes</div>
                    <div className="summary-value">{selected.summary?.valid?.toLocaleString()}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Rejected Votes</div>
                    <div className="summary-value">{selected.summary?.rejected?.toLocaleString()}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Polled</div>
                    <div className="summary-value">{selected.summary?.polled?.toLocaleString()}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Percent Polled</div>
                    <div className="summary-value">{selected.summary?.percent_polled}%</div>
                  </div>
                </div>
              </div>

              <div>
                <h3>Top Candidates</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px" }}>Candidate</th>
                      <th style={{ padding: "8px" }}>Party</th>
                      <th style={{ padding: "8px" }}>Votes</th>
                      <th style={{ padding: "8px" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.by_party?.slice(0, 5).map((party, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px" }}>{party.candidate}</td>
                        <td style={{ padding: "8px" }}>{party.party_name}</td>
                        <td style={{ padding: "8px" }}>
                          {party.votes?.toLocaleString()}
                        </td>
                        <td style={{ padding: "8px" }}>{party.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: "100px", color: "#666" }}>
              Select a district to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectoralDataViewer;