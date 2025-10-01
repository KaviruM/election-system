import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import colors from "../../candidates-2024-presidental.json";


// Import candidate symbols
import AJP from "../symbols/AJP.png";
import APP from "../symbols/APP.png";
import DUA from "../symbols/DUA.png";
import DUNF from "../symbols/DUNF.png";
import ELPP from "../symbols/ELPP.png";
import IND1 from "../symbols/IND1.png";
import IND2 from "../symbols/IND2.png";
import IND3 from "../symbols/IND3.png";
import IND4 from "../symbols/IND4.png";
import IND5 from "../symbols/IND5.png";
import IND6 from "../symbols/IND6.png";
import IND7 from "../symbols/IND7.png";
import IND8 from "../symbols/IND8.png";
import IND9 from "../symbols/IND9.png";
import IND10 from "../symbols/IND10.png";
import IND11 from "../symbols/IND11.png";
import IND12 from "../symbols/IND12.png";
import IND13 from "../symbols/IND13.png";
import IND14 from "../symbols/IND14.png";
import IND15 from "../symbols/IND15.png";
import IND16 from "../symbols/IND16.png";
import JPF from "../symbols/JPF.png";
import JSP from "../symbols/JSP.png";
import NDF from "../symbols/NDF.png";
import NIF from "../symbols/NIF.png";
import NPP from "../symbols/NPP.png";
import NSSP from "../symbols/NSSP.png";
import NSU from "../symbols/NSU.png";
import RJA from "../symbols/RJA.png";
import SBP from "../symbols/SBP.png";
import SEP from "../symbols/SEP.png";
import SJB from "../symbols/SJB.png";
import SLCP from "../symbols/SLCP.png";
import SLLP from "../symbols/SLLP.png";
import SLPP from "../symbols/SLPP.png";
import SLSP from "../symbols/SLSP.png";
import SPF from "../symbols/SPF.png";
import UNFF from "../symbols/UNFF.png";
import USP from "../symbols/USP.png";
import { IslandMap } from "./islandMap";


// Symbol mapping object
const symbolMap = {
  AJP: AJP,
  APP: APP,
  DUA: DUA,
  DUNF: DUNF,
  ELPP: ELPP,
  IND1: IND1,
  IND2: IND2,
  IND3: IND3,
  IND4: IND4,
  IND5: IND5,
  IND6: IND6,
  IND7: IND7,
  IND8: IND8,
  IND9: IND9,
  IND10: IND10,
  IND11: IND11,
  IND12: IND12,
  IND13: IND13,
  IND14: IND14,
  IND15: IND15,
  IND16: IND16,
  JPF: JPF,
  JSP: JSP,
  NDF: NDF,
  NIF: NIF,
  NPP: NPP,
  NSSP: NSSP,
  NSU: NSU,
  RJA: RJA,
  SBP: SBP,
  SEP: SEP,
  SJB: SJB,
  SLCP: SLCP,
  SLLP: SLLP,
  SLPP: SLPP,
  SLSP: SLSP,
  SPF: SPF,
  UNFF: UNFF,
  USP: USP,
};


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
    // if ED results exist
    if (district.ed_results && district.ed_results.summary) {
      return {
        validVotes: district.ed_results.summary.valid || 0,
        rejectedVotes: district.ed_results.summary.rejected || 0,
        totalPolled: district.ed_results.summary.polled || 0,
        totalVoters: district.ed_results.summary.total_voters || 0,
        percentPolled: district.ed_results.summary.percent_polled || 0,
      };
    }

    // if ED results do not exist, calculate from PV + PD
    let total = {
      validVotes: 0,
      rejectedVotes: 0,
      totalPolled: 0,
      totalVoters: 0,
      percentPolled: 0,
    };

    // Add Postal Votes (PV)
    if (district.pv_results && district.pv_results.summary) {
      total.validVotes += district.pv_results.summary.valid || 0;
      total.rejectedVotes += district.pv_results.summary.rejected || 0;
      total.totalPolled += district.pv_results.summary.polled || 0;
      total.totalVoters += district.pv_results.summary.total_voters || 0;
    }

    // Add Polling Division Results (PD)
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

    // Calculate percentage
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
      // Check if district has final ED result
      if (district.ed_results && district.ed_results.summary) {
        // Use Electoral District final result
        totals.validVotes += district.ed_results.summary.valid || 0;
        totals.rejectedVotes += district.ed_results.summary.rejected || 0;
        totals.totalPolled += district.ed_results.summary.polled || 0;
        totals.totalVoters += district.ed_results.summary.total_voters || 0;
      } else {
        // Use PV + PD calculation for this district
        const districtTotal = calculateDistrictTotals(district);
        totals.validVotes += districtTotal.validVotes;
        totals.rejectedVotes += districtTotal.rejectedVotes;
        totals.totalPolled += districtTotal.totalPolled;
        totals.totalVoters += districtTotal.totalVoters;
      }
    });


    return totals;
  };



  // Calculate totals
  const calculateTotals = () => {
    // district total calculation
    if (totalView === "district" && selected) {
      return calculateDistrictTotals(selected);
    } else {
      // Island total calculation
      return calculateIslandTotals(districts);
    }
  };



  // Get top 5 candidates (island)
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

    // Sort top 5
    candidates.sort((a, b) => b.votes - a.votes);
    return candidates.slice(0, 5);
  };



  // Get candidate official color
  const getCandidateColor = (candidate) => {
    if (!candidate) return "#c7c6c6ff";
    // Try to match by candidate id or name
    let found = colors.find(
      (c) =>
        (c.id && candidate.candidate_id && c.id === candidate.candidate_id) ||
        (c.name &&
          c.name.en &&
          candidate.candidate &&
          c.name.en === candidate.candidate)
    );
    // fallback: try by party name
    if (!found && candidate.party_name) {
      found = colors.find(
        (c) => c.party && c.party.name === candidate.party_name
      );
    }
    // Use first color if available
    if (
      found &&
      found.party &&
      Array.isArray(found.party.color) &&
      found.party.color.length > 0
    ) {
      return found.party.color[0];
    }
    return "#c7c6c6ff";
  };



  // Get candidate symbol image
  const getCandidateSymbol = (candidate) => {
    if (!candidate) {
      return null;
    }

    if (!candidate.party_code) {
      return null;
    }

    const symbol = symbolMap[candidate.party_code];

    if (symbol) {
      return symbol;
    } else {
      return null;
    }
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
              className={`total-btn ${
                totalView === "district" ? "active" : ""
              }`}
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

              <div key={index} className="candidate-card" style={{ backgroundColor: getCandidateColor(candidate) }}>

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
           <IslandMap districts={districts} />
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
                      {calculateDistrictTotals(
                        selected
                      ).validVotes?.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Rejected Votes</div>
                    <div className="summary-value">
                      {calculateDistrictTotals(
                        selected
                      ).rejectedVotes?.toLocaleString()}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Polled</div>
                    <div className="summary-value">
                      {calculateDistrictTotals(
                        selected
                      ).totalPolled?.toLocaleString()}
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
                    <div key={index} className="candidate-card">

                      <div className="candidate-rank">{index + 1}</div>

                      {getCandidateSymbol(candidate) && (
                        <img
                          src={getCandidateSymbol(candidate)}
                          alt={candidate.candidate}
                          className="candidate-symbol"
                        />
                      )}

                      <div className="candidate-info">
                        <div className="candidate-name">
                          {candidate.candidate}
                        </div>
                        <div className="candidate-party">
                          {candidate.party_name}
                        </div>
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
            <div
              style={{ textAlign: "center", marginTop: "100px", color: "#666" }}
            >
              Select a district to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectoralDataViewer;
