package com.rfnexus;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ProtocolLogger")
public class ProtocolLoggerBridge extends Plugin {
    private ProtocolLogger protocolLogger;

    @Override
    public void load() {
        protocolLogger = new ProtocolLogger(getContext());
    }

    @PluginMethod
    public void startRrcMonitoring(PluginCall call) {
        protocolLogger.startRrcMonitoring();
        call.resolve();
    }

    @PluginMethod
    public void stopRrcMonitoring(PluginCall call) {
        protocolLogger.stopRrcMonitoring();
        call.resolve();
    }

    @PluginMethod
    public void readLogFileAsJson(PluginCall call) {
        String json = protocolLogger.readLogFileAsJson();
        JSObject result = new JSObject();
        result.put("log", json);
        call.resolve(result);
    }
}
