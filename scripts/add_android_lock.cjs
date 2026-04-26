const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add tempDeviceInterface state
const stateTarget = `  const [tempNetworkType, setTempNetworkType] = useState('');
  const [bandSearchQuery, setBandSearchQuery] = useState('');`;

const stateReplacement = `  const [tempNetworkType, setTempNetworkType] = useState('');
  const [tempDeviceInterface, setTempDeviceInterface] = useState('Android (ADB/Intent)');
  const [deviceInterface, setDeviceInterface] = useState('Android (ADB/Intent)');
  const [bandSearchQuery, setBandSearchQuery] = useState('');`;

code = code.replace(stateTarget, stateReplacement);

// 2. Add to openLockModal
const openLockTarget = `  const openLockModal = () => {
    setTempTech(lockedTech || 'LTE-4G');
    setTempBands(lockedBands);
    setTempRoaming(isDataRoamingEnabled);
    setTempBandLockingEnabled(isBandLockingEnabled);
    setTempNetworkType(preferredNetworkType);
    setIsLockModalOpen(true);
  };`;

const openLockReplacement = `  const openLockModal = () => {
    setTempTech(lockedTech || 'LTE-4G');
    setTempBands(lockedBands);
    setTempRoaming(isDataRoamingEnabled);
    setTempBandLockingEnabled(isBandLockingEnabled);
    setTempNetworkType(preferredNetworkType);
    setTempDeviceInterface(deviceInterface);
    setIsLockModalOpen(true);
  };`;

code = code.replace(openLockTarget, openLockReplacement);

// 3. UI Update in Lock Modal
const modalUITarget = `              <div className="flex flex-col max-h-[70vh] overflow-y-auto scrollbar-hide">
                {/* Preferred Network Type */}
                <div className="p-4 border-b border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Preferred Network Type</label>`;

const modalUIReplacement = `              <div className="flex flex-col max-h-[70vh] overflow-y-auto scrollbar-hide">
                {/* Target Device Interface */}
                <div className="p-4 border-b border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Target Device Interface</label>
                  <select 
                    value={tempDeviceInterface}
                    onChange={(e) => setTempDeviceInterface(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option>Android (ADB/Intent)</option>
                    <option>Modem (Serial AT)</option>
                  </select>
                </div>
                {/* Preferred Network Type */}
                <div className="p-4 border-b border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Preferred Network Type</label>`;

code = code.replace(modalUITarget, modalUIReplacement);

// 4. Submit button logic
const submitLogicTarget = `                  disabled={isSendingCommand}
                  onClick={async () => {
                    setIsSendingCommand(true);
                    const logs = [...terminalLogs];
                    logs.push(\`> AT+QNWPREFCFG="mode_pref",\${tempNetworkType.includes('5G') ? 'NR5G' : 'LTE'}\`);
                    setTerminalLogs([...logs]);
                    await new Promise(r => setTimeout(r, 600));
                    logs.push('OK');
                    setTerminalLogs([...logs]);
                    
                    if (tempBandLockingEnabled && tempTech && tempBands.length > 0) {
                      const bandStr = tempBands.join(':');
                      logs.push(\`> AT+QNWLOCK="attr",\${tempTech.split('-')[0]},\${bandStr}\`);
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 800));
                      logs.push('OK');
                      setTerminalLogs([...logs]);
                    } else if (!tempBandLockingEnabled && isBandLockingEnabled) {
                      // Reverting to default if it was previously enabled
                      logs.push(\`> AT+QNWLOCK="attr","clear"\`);
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 600));
                      logs.push('OK');
                      setTerminalLogs([...logs]);
                    }

                    logs.push('> AT+CFUN=1,1');
                    setTerminalLogs([...logs]);
                    await new Promise(r => setTimeout(r, 1000));
                    logs.push('MODEM REBOOTING...');
                    setTerminalLogs([...logs]);
                    await new Promise(r => setTimeout(r, 500));
                    
                    setLockedTech(tempBandLockingEnabled ? tempTech : null);
                    setLockedBands(tempBandLockingEnabled ? tempBands : []);
                    setIsBandLockingEnabled(tempBandLockingEnabled);
                    setIsDataRoamingEnabled(tempRoaming);
                    setPreferredNetworkType(tempNetworkType);
                    setIsSendingCommand(false);`;


const submitLogicReplacement = `                  disabled={isSendingCommand}
                  onClick={async () => {
                    setIsSendingCommand(true);
                    const logs = [...terminalLogs];
                    
                    if (tempDeviceInterface === 'Android (ADB/Intent)') {
                      logs.push('> Initialize ADB root context...');
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 400));
                      logs.push('OK');
                      
                      const networkTypeMode = tempNetworkType.includes('5G') ? 11 : 9;
                      logs.push(\`> adb shell settings put global preferred_network_mode \${networkTypeMode}\`);
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 500));

                      if (tempBandLockingEnabled && tempTech && tempBands.length > 0) {
                        const bandStr = tempBands.join(',');
                        logs.push(\`> adb shell am broadcast -a com.engineering.lock -e tech \${tempTech.split('-')[0]} -e bands "\${bandStr}"\`);
                        setTerminalLogs([...logs]);
                        await new Promise(r => setTimeout(r, 900));
                        logs.push('Broadcast completed: result=1');
                        setTerminalLogs([...logs]);
                      } else if (!tempBandLockingEnabled && isBandLockingEnabled) {
                        logs.push(\`> adb shell am broadcast -a com.engineering.unlock_all\`);
                        setTerminalLogs([...logs]);
                        await new Promise(r => setTimeout(r, 600));
                        logs.push('Broadcast completed: result=1');
                        setTerminalLogs([...logs]);
                      }

                      logs.push('> adb shell svc data disable && sleep 1 && svc data enable');
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 1200));
                      logs.push('RADIO RESTARTED...');
                    } else {
                      logs.push(\`> AT+QNWPREFCFG="mode_pref",\${tempNetworkType.includes('5G') ? 'NR5G' : 'LTE'}\`);
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 600));
                      logs.push('OK');
                      setTerminalLogs([...logs]);
                      
                      if (tempBandLockingEnabled && tempTech && tempBands.length > 0) {
                        const bandStr = tempBands.join(':');
                        logs.push(\`> AT+QNWLOCK="attr",\${tempTech.split('-')[0]},\${bandStr}\`);
                        setTerminalLogs([...logs]);
                        await new Promise(r => setTimeout(r, 800));
                        logs.push('OK');
                        setTerminalLogs([...logs]);
                      } else if (!tempBandLockingEnabled && isBandLockingEnabled) {
                        logs.push(\`> AT+QNWLOCK="attr","clear"\`);
                        setTerminalLogs([...logs]);
                        await new Promise(r => setTimeout(r, 600));
                        logs.push('OK');
                        setTerminalLogs([...logs]);
                      }

                      logs.push('> AT+CFUN=1,1');
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 1000));
                      logs.push('MODEM REBOOTING...');
                    }
                    
                    setTerminalLogs([...logs]);
                    await new Promise(r => setTimeout(r, 500));
                    
                    setDeviceInterface(tempDeviceInterface);
                    setLockedTech(tempBandLockingEnabled ? tempTech : null);
                    setLockedBands(tempBandLockingEnabled ? tempBands : []);
                    setIsBandLockingEnabled(tempBandLockingEnabled);
                    setIsDataRoamingEnabled(tempRoaming);
                    setPreferredNetworkType(tempNetworkType);
                    setIsSendingCommand(false);`;

code = code.replace(submitLogicTarget, submitLogicReplacement);
fs.writeFileSync('src/App.tsx', code);
