import { useState, useEffect, useRef } from "react";
import "./App.css";
import colors from "../../candidates-2024-presidental.json";

const ElectoralDataViewer = () => {
  const [connected, setConnected] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [totalView, setTotalView] = useState("island");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const wsRef = useRef(null);

  
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("Connection failed");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "initial_data" || data.type === "data_update") {
        const transformedDistricts = transformServerData(
          data.electoralData || {}
        );
        setDistricts(transformedDistricts);
      } else if (data.type === "upload_success") {
        setSuccess(
          `${data.resultType} data uploaded successfully for ${data.districtName}!`
        );
      } else if (data.type === "error") {
        setError(data.message);
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);


  const transformServerData = (serverData) => {
    if (!serverData || typeof serverData !== "object") {
      return [];
    }

    return Object.keys(serverData).map((districtCode) => {
      const districtData = serverData[districtCode];
      return {
        ed_code: districtCode,
        ed_name: districtData.district_name || "Unknown District",
        ed_results: districtData.ED || null,
        pv_results: Object.values(districtData.PV || {})[0] || null,
        pd_results: Object.values(districtData.PD || {}) || [],
      };
    });
  };


  // Calculate district totals
  const calculateDistrictTotals = (district) => {
    if (district.ed_results && district.ed_results.summary) {
      return {
        validVotes: district.ed_results.summary.valid || 0,
        rejectedVotes: district.ed_results.summary.rejected || 0,
        totalPolled: district.ed_results.summary.polled || 0,
        totalVoters: district.ed_results.summary.total_voters || 0,
        percentPolled: district.ed_results.summary.percent_polled || 0,
      };
    }

    let total = {
      validVotes: 0,
      rejectedVotes: 0,
      totalPolled: 0,
      totalVoters: 0,
      percentPolled: 0,
    };

    if (district.pv_results && district.pv_results.summary) {
      total.validVotes += district.pv_results.summary.valid || 0;
      total.rejectedVotes += district.pv_results.summary.rejected || 0;
      total.totalPolled += district.pv_results.summary.polled || 0;
      total.totalVoters += district.pv_results.summary.total_voters || 0;
    }

    if (district.pd_results && Array.isArray(district.pd_results)) {
      district.pd_results.forEach((pd) => {
        if (pd.summary) {
          total.validVotes += pd.summary.valid || 0;
          total.rejectedVotes += pd.summary.rejected || 0;
          total.totalPolled += pd.summary.polled || 0;
          total.totalVoters += pd.summary.total_voters || 0;
        }
      });
    }

    total.percentPolled =
      total.totalVoters > 0
        ? ((total.totalPolled / total.totalVoters) * 100).toFixed(2)
        : 0;

    return total;
  };


  // Calculate island totals
  const calculateIslandTotals = (districts) => {
    let totals = {
      validVotes: 0,
      rejectedVotes: 0,
      totalPolled: 0,
      totalVoters: 0,
      percentPolled: 0,
    };

    districts.forEach((district) => {
      if (district.ed_results && district.ed_results.summary) {
        totals.validVotes += district.ed_results.summary.valid || 0;
        totals.rejectedVotes += district.ed_results.summary.rejected || 0;
        totals.totalPolled += district.ed_results.summary.polled || 0;
        totals.totalVoters += district.ed_results.summary.total_voters || 0;
      } else {
        const districtTotal = calculateDistrictTotals(district);
        totals.validVotes += districtTotal.validVotes;
        totals.rejectedVotes += districtTotal.rejectedVotes;
        totals.totalPolled += districtTotal.totalPolled;
        totals.totalVoters += districtTotal.totalVoters;
      }
    });

    return totals;
  };

  const calculateTotals = () => {
    if (totalView === "district" && selected) {
      return calculateDistrictTotals(selected);
    } else {
      return calculateIslandTotals(districts);
    }
  };


  // Get top 5 candidates
  const getTopCandidates = (islandWide = false, district = null) => {
    let candidates = [];

    if (islandWide) {
      const candidateMap = {};
      districts.forEach((district) => {
        let districtCandidates = [];
        if (district.ed_results && district.ed_results.by_party) {
          districtCandidates = district.ed_results.by_party;
        } else if (district.pv_results && district.pv_results.by_party) {
          districtCandidates = district.pv_results.by_party;
        } else if (
          district.pd_results &&
          district.pd_results.length > 0 &&
          district.pd_results[0].by_party
        ) {
          districtCandidates = district.pd_results[0].by_party;
        }

        districtCandidates.forEach((party) => {
          if (!candidateMap[party.candidate]) {
            candidateMap[party.candidate] = { ...party };
          } else {
            candidateMap[party.candidate].votes += party.votes || 0;
          }
        });
      });

      candidates = Object.values(candidateMap);
    } else if (district) {
      if (district.ed_results && district.ed_results.by_party) {
        candidates = district.ed_results.by_party;
      } else if (district.pv_results && district.pv_results.by_party) {
        candidates = district.pv_results.by_party;
      } else if (
        district.pd_results &&
        district.pd_results.length > 0 &&
        district.pd_results[0].by_party
      ) {
        candidates = district.pd_results[0].by_party;
      }
    }

    candidates.sort((a, b) => b.votes - a.votes);
    return candidates.slice(0, 5);
  };


  // Get candidate official color or gradient
  const getCandidateColor = (candidate, colors = []) => {
    if (!candidate || !Array.isArray(colors)) return "#c7c6c6ff";

    let found = colors.find(
      (c) => c.party && c.party.name === candidate.party_name
    );

    if (found && found.party && Array.isArray(found.party.color) && found.party.color.length > 0) {
      return `linear-gradient(to right, ${found.party.color.join(", ")})`;
    }

    return "#c7c6c6ff";
  };


  // Get candidate symbol
  const getCandidateSymbol = (candidate) => {
    if (!candidate || !candidate.party_code) return null;
    return `/symbols/${candidate.party_code}.png`;
  };

  if (!connected) {
    return (
      <div className="connection">
        Connecting to server...
        {error && (
          <div style={{ color: "red", marginTop: "10px" }}>Error: {error}</div>
        )}
      </div>
    );
  }

  const totals = calculateTotals();
  const topCandidates = getTopCandidates(totalView === "island", selected);

  return (
    <div className="container">
      <div className="totals-section">
        <div className="totals-header">
          <h2>Electoral Results</h2>
          <div className="total-buttons">
            <button
              className={`total-btn ${totalView === "island" ? "active" : ""}`}
              onClick={() => setTotalView("island")}
            >
              Island Totals
            </button>
            <button
              className={`total-btn ${totalView === "district" ? "active" : ""}`}
              onClick={() => setTotalView("district")}
              disabled={!selected}
            >
              District Totals
            </button>
          </div>
        </div>

        <div className="totals-cards">
          <div className="total-card">
            <div className="total-label">Valid Votes</div>
            <div className="total-value">
              {totals.validVotes.toLocaleString()}
            </div>
          </div>
          <div className="total-card">
            <div className="total-label">Rejected Votes</div>
            <div className="total-value">
              {totals.rejectedVotes.toLocaleString()}
            </div>
          </div>
          <div className="total-card">
            <div className="total-label">Total Polled</div>
            <div className="total-value">
              {totals.totalPolled.toLocaleString()}
            </div>
          </div>
          <div className="total-card">
            <div className="total-label">Percent Polled</div>
            <div className="total-value">{totals.percentPolled}%</div>
          </div>
        </div>

        <div className="topfive-candidates">
          <h3>
            Top 5 Candidates{" "}
            {totalView === "island"
              ? "Island-wide"
              : selected
              ? `in ${selected.ed_name}`
              : ""}
          </h3>

          <div className="candidates-cards">
            {topCandidates.map((candidate, index) => (
              <div
                key={index}
                className="candidate-card"
                style={{ background: getCandidateColor(candidate, colors) }}
              >
                <div className="candidate-rank">{index + 1}</div>

                {getCandidateSymbol(candidate) && (
                  <img
                    src={getCandidateSymbol(candidate)}
                    alt={candidate.candidate}
                    className="candidate-symbol"
                  />
                )}

                <div className="candidate-info">
                  <div className="candidate-name">{candidate.candidate}</div>
                  <div className="candidate-party">{candidate.party_name}</div>
                  <div className="candidate-votes">
                    {candidate.votes?.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="districts">
          <h2>Districts ({districts.length})</h2>
          {districts.map((district) => {
            const districtTotals = calculateDistrictTotals(district);
            return (
              <div
                key={district.ed_code}
                onClick={() => setSelected(district)}
                className="district"
              >
                <strong>{district.ed_name}</strong>
                <div>Code: {district.ed_code}</div>
                <div>Turnout: {districtTotals.percentPolled}%</div>
              </div>
            );
          })}
        </div>

        <div className="charts">
          {selected ? (
            <div>
              <h2>{selected.ed_name}</h2>
              <div>Code: {selected.ed_code}</div>

              <div className="details">
                <h3>Summary</h3>
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="summary-label">Valid Votes</div>
                    <div className="summary-value">
                      {calculateDistrictTotals(selected).validVotes?.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Rejected Votes</div>
                    <div className="summary-value">
                      {calculateDistrictTotals(selected).rejectedVotes?.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Polled</div>
                    <div className="summary-value">
                      {calculateDistrictTotals(selected).totalPolled?.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Percent Polled</div>
                    <div className="summary-value">
                      {calculateDistrictTotals(selected).percentPolled}%
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3>Top Candidates</h3>
                <div className="candidates-cards">
                  {getTopCandidates(false, selected).map((candidate, index) => (
                    <div
                      key={index}
                      className="candidate-card"
                      style={{ background: getCandidateColor(candidate, colors) }}
                    >
                      <div className="candidate-rank">{index + 1}</div>

                      {getCandidateSymbol(candidate) && (
                        <img
                          src={getCandidateSymbol(candidate)}
                          alt={candidate.candidate}
                          className="candidate-symbol"
                        />
                      )}

                      <div className="candidate-info">
                        <div className="candidate-name">{candidate.candidate}</div>
                        <div className="candidate-party">{candidate.party_name}</div>
                      </div>
                      <div className="candidate-stats">
                        <div className="candidate-votes">
                          {candidate.votes?.toLocaleString()}
                        </div>
                        <div className="candidate-percentage">
                          {candidate.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
