import React, { useState, useEffect } from 'react';
import { Navbar } from './views/Navbar';
import { OverviewView } from './views/OverviewView';
import { AutopilotView } from './views/AutopilotView';
import { SubTabs } from './views/SubTabs';
import { DigitalTwinView } from './views/DigitalTwinView';
import { DynamometerCard } from './views/DynamometerCard';
import { CSSOptimizerView } from './views/CSSOptimizerView';
import { SRPOptimizerView } from './views/SRPOptimizerView';
import { FailureIntelligenceView } from './views/FailureIntelligenceView';
import { ScenarioLabView } from './views/ScenarioLabView';
import { ParetoOptimizationView } from './views/ParetoOptimizationView';
import { AICopilotDrawer } from './views/AICopilotDrawer';
import { JuryDemoModal } from './views/JuryDemoModal';

import { api } from './lib/api';
import {
  WellId,
  TelemetryFrame,
  DynoCardData,
  FailureIntelligence,
  OptimizationResult
} from './contracts/domain';

export function App() {
  const [selectedWell, setSelectedWell] = useState<WellId>('BW-DEMO-001');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [decisionTab, setDecisionTab] = useState<string>('pareto');
  const [liveTab, setLiveTab] = useState<string>('failures');

  // Old page ids (still used by the tour and in-page links) map onto the 4 sections
  const navigate = React.useCallback((t: string) => {
    if (['pareto', 'css-optimizer', 'srp-optimizer', 'scenario-lab'].includes(t)) { setDecisionTab(t); setActiveTab('decisions'); }
    else if (['live-ops', 'failures'].includes(t)) { setLiveTab(t); setActiveTab('live'); }
    else if (t === 'dashboard') setActiveTab('overview');
    else setActiveTab(t);
  }, []);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isJuryModalOpen, setIsJuryModalOpen] = useState<boolean>(false);

  // Core Data States
  const [telemetry, setTelemetry] = useState<TelemetryFrame | null>(null);
  const [dynoData, setDynoData] = useState<DynoCardData | null>(null);
  const [failureData, setFailureData] = useState<FailureIntelligence | null>(null);
  const [optData, setOptData] = useState<OptimizationResult | null>(null);

  // Periodic telemetry poll
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [tel, dyno, fail, opt] = await Promise.all([
          api.getTelemetry(selectedWell),
          api.getDynoCard(selectedWell),
          api.getFailureIntelligence(selectedWell),
          api.runOptimization(selectedWell)
        ]);

        if (isMounted) {
          setTelemetry(tel);
          setDynoData(dyno);
          setFailureData(fail);
          setOptData(opt);
        }
      } catch (err) {
        console.error('Data poll error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedWell]);

  const handleApplyPlan = (plan: any) => {
    alert(`Operating plan dispatched successfully!\nSPM: ${plan.spm} | Stroke: ${plan.stroke_m}m | Next Steam: ${plan.steam_tons} T\nLogged to Immutable Field Audit Ledger.`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left sidebar navigation */}
      <Navbar
        selectedWell={selectedWell}
        onSelectWell={(w) => setSelectedWell(w)}
        activeTab={activeTab}
        onSelectTab={navigate}
        onOpenJuryDemo={() => setIsJuryModalOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, maxWidth: '1560px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'overview' && <OverviewView selectedWell={selectedWell} onSelectWell={(w) => setSelectedWell(w as WellId)} />}

        {activeTab === 'autopilot' && (
          <AutopilotView selectedWell={selectedWell} onNavigateTab={navigate} />
        )}

        {activeTab === 'digital-twin' && (
          <DigitalTwinView
            key={selectedWell}
            currentTelemetry={telemetry}
            selectedWell={selectedWell}
            onNavigateTab={navigate}
          />
        )}

        {activeTab === 'live' && (
          <>
            <SubTabs title="Live operations" subtitle="Surface dynamometer and failure watch, streamed from the rigs."
              tabs={[{ id: 'failures', label: 'Failure watch' }, { id: 'live-ops', label: 'Dynamometer' }]}
              active={liveTab} onChange={setLiveTab} />
            {liveTab === 'failures' && <FailureIntelligenceView failureData={failureData} onNavigateTab={navigate} />}
            {liveTab === 'live-ops' && (
              <DynamometerCard dynoData={dynoData} onRefresh={async () => setDynoData(await api.getDynoCard(selectedWell))} />
            )}
          </>
        )}

        {activeTab === 'decisions' && (
          <>
            <SubTabs title="Decisions" subtitle="How autopilot chose its setpoints, the trade-offs, and a sandbox to test your own."
              tabs={[
                { id: 'pareto', label: 'Trade-offs' },
                { id: 'srp-optimizer', label: 'Pump speed' },
                { id: 'css-optimizer', label: 'Steam cycle' },
                { id: 'scenario-lab', label: 'What-if' }
              ]}
              active={decisionTab} onChange={setDecisionTab} />
            {decisionTab === 'pareto' && <ParetoOptimizationView optimizationData={optData} onApplyPlan={handleApplyPlan} />}
            {decisionTab === 'srp-optimizer' && <SRPOptimizerView />}
            {decisionTab === 'css-optimizer' && <CSSOptimizerView />}
            {decisionTab === 'scenario-lab' && <ScenarioLabView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '14px 24px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.72rem',
        color: 'var(--text-faint)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>Drava · Oil India Limited · Baghewala Heavy Oil Field</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Marx-Langenheim · ASTM D341 · API RP 11L</span>
          <span style={{ color: 'var(--warn)' }}>Simulation mode active</span>
        </div>
      </footer>
      </div>

      {/* AI Copilot Side Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        selectedWell={selectedWell}
      />

      {/* 5-Minute Guided System Walkthrough */}
      {/* Mounted only while open, so every tour starts fresh at stage 1 */}
      {isJuryModalOpen && (
        <JuryDemoModal
          isOpen
          onClose={() => setIsJuryModalOpen(false)}
          onNavigateTab={navigate}
        />
      )}

    </div>
  );
}

export default App;
