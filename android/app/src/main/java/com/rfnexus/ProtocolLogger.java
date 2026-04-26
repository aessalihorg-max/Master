package com.rfnexus;

import android.content.Context;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.telephony.CellInfo;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoNr;
import android.telephony.SignalStrength;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ProtocolLogger
 * Monitors Android Telephony events and logs them with timestamps.
 * Primarily RRC state changes, handovers, and measurement reports.
 */
public class ProtocolLogger {
    private static final String TAG = "RFNexus:ProtocolLogger";
    private Context context;
    private BufferedWriter logWriter;
    private File logFile;
    private TelephonyCallback telephonyCallback;
    private TelephonyManager telephonyManager;
    
    private int lastCellPci = -1;
    private String lastRrcState = "UNKNOWN";
    private int lastSignalStrength = -999;

    public ProtocolLogger(Context context) {
        this.context = context;
        this.telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        initializeLogFile();
    }

    private void initializeLogFile() {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US);
            String timestamp = sdf.format(new Date());
            logFile = new File(context.getExternalFilesDir(null), "protocol_log_" + timestamp + ".txt");
            logWriter = new BufferedWriter(new FileWriter(logFile, true));
            Log.d(TAG, "Log file initialized: " + logFile.getAbsolutePath());
        } catch (IOException e) {
            Log.e(TAG, "Failed to create log file", e);
        }
    }

    public void startRrcMonitoring() {
        if (android.os.Build.VERSION.SDK_INT < 31) {
            logMessage("ERROR", "Protocol logging requires Android 12+ (API 31+)");
            return;
        }

        try {
            telephonyCallback = new ProtocolTelephonyCallback(this);
            telephonyManager.registerTelephonyCallback(context.getMainExecutor(), telephonyCallback);
            logMessage("MONITOR_START", "Protocol logger initialized");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start monitoring", e);
            logMessage("ERROR", "Start failed: " + e.getMessage());
        }
    }

    public void stopRrcMonitoring() {
        try {
            if (telephonyCallback != null && telephonyManager != null) {
                telephonyManager.unregisterTelephonyCallback(telephonyCallback);
            }
            if (logWriter != null) {
                logWriter.close();
            }
            logMessage("MONITOR_STOP", "Protocol logger closed");
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop monitoring", e);
        }
    }

    public void logMessage(String messageType, String content) {
        try {
            String timestamp = new SimpleDateFormat("HH:mm:ss.SSS", Locale.US).format(new Date());
            String logLine = String.format("[%s] %s: %s\n", timestamp, messageType, content);

            if (logWriter != null) {
                logWriter.write(logLine);
                logWriter.flush();
            }
            Log.d(TAG, logLine);
        } catch (IOException e) {
            Log.e(TAG, "Log write failed", e);
        }
    }

    public String getLogFilePath() {
        return logFile != null ? logFile.getAbsolutePath() : null;
    }

    public String readLogFileAsJson() {
        try {
            StringBuilder content = new StringBuilder();
            BufferedReader reader = new BufferedReader(new FileReader(logFile));
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
            reader.close();

            String[] lines = content.toString().split("\n");
            JSONArray jsonArray = new JSONArray();

            for (String l : lines) {
                if (l.trim().isEmpty()) continue;
                Pattern pattern = Pattern.compile("\\[(.+?)\\]\\s+(.+?):\\s+(.+)");
                Matcher matcher = pattern.matcher(l);

                if (matcher.find()) {
                    JSONObject obj = new JSONObject();
                    obj.put("timestamp", matcher.group(1));
                    obj.put("type", matcher.group(2));
                    obj.put("content", matcher.group(3));
                    jsonArray.put(obj);
                }
            }
            return jsonArray.toString();
        } catch (Exception e) {
            Log.e(TAG, "Failed to read log file", e);
            return "[]";
        }
    }

    public void onRrcStateChanged(String newState) {
        if (!newState.equals(lastRrcState)) {
            logMessage("RRC_STATE_CHANGE", lastRrcState + " -> " + newState);
            lastRrcState = newState;
        }
    }

    public void onCellPciChanged(int newPci) {
        if (lastCellPci >= 0 && newPci != lastCellPci) {
            logMessage("HANDOVER", "PCI " + lastCellPci + " -> " + newPci);
        }
        lastCellPci = newPci;
    }

    public void onSignalStrengthChanged(int rsrp, int sinr) {
        if (Math.abs(rsrp - lastSignalStrength) > 5) {
            logMessage("MEASUREMENT_REPORT", String.format("RSRP=%d dBm, SINR=%d dB", rsrp, sinr));
            lastSignalStrength = rsrp;
        }
    }
}

class ProtocolTelephonyCallback extends TelephonyCallback
    implements TelephonyCallback.CellInfoListener,
               TelephonyCallback.CallStateListener,
               TelephonyCallback.SignalStrengthListener {

    private ProtocolLogger logger;

    public ProtocolTelephonyCallback(ProtocolLogger logger) {
        this.logger = logger;
    }

    @Override
    public void onCellInfoChanged(List<CellInfo> cellInfo) {
        if (cellInfo == null || cellInfo.isEmpty()) return;
        CellInfo cell = cellInfo.get(0);
        if (cell instanceof CellInfoLte) {
            CellInfoLte lte = (CellInfoLte) cell;
            logger.onCellPciChanged(lte.getCellIdentity().getPci());
            logger.onSignalStrengthChanged(lte.getCellSignalStrength().getRsrp(), lte.getCellSignalStrength().getRsrq());
        } else if (cell instanceof CellInfoNr) {
            CellInfoNr nr = (CellInfoNr) cell;
            logger.onCellPciChanged(nr.getCellIdentity().getPci());
            logger.onSignalStrengthChanged(nr.getCellSignalStrength().getSsRsrp(), nr.getCellSignalStrength().getSsSinr());
        }
    }

    @Override
    public void onCallStateChanged(int state) {
        String stateStr = (state == TelephonyManager.CALL_STATE_OFFHOOK) ? "CONNECTED" : "IDLE";
        logger.onRrcStateChanged(stateStr);
    }

    @Override
    public void onSignalStrengthsChanged(SignalStrength signalStrength) {}
}
