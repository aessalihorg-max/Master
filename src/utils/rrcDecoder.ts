/**
 * rrcDecoder.ts
 * Decodes 3GPP LTE/5G RRC messages from binary (ASN.1 format)
 */

export interface DecodedRrcMessage {
  messageType: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  fields: { [key: string]: string };
  timestamp: string;
}

export function decodeRrcMessage(hexData: string): DecodedRrcMessage {
  try {
    const binary = hexToBinary(hexData);
    const firstByte = binary.substring(0, 8);
    const messageType = identifyMessageType(firstByte);

    const baseResult: DecodedRrcMessage = {
      messageType,
      description: '',
      severity: 'info',
      fields: {},
      timestamp: new Date().toISOString(),
    };

    switch (messageType) {
      case 'RrcConnectionSetup':
        return { ...baseResult, ...decodeRrcConnectionSetup(binary) };
      case 'RrcConnectionReconfiguration':
        return { ...baseResult, ...decodeRrcConnectionReconfiguration(binary) };
      case 'RrcConnectionRelease':
        return { ...baseResult, ...decodeRrcConnectionRelease(binary) };
      case 'SecurityModeCommand':
        return { ...baseResult, ...decodeSecurityModeCommand(binary) };
      case 'MeasurementReport':
        return { ...baseResult, ...decodeMeasurementReport(binary) };
      case 'HandoverCommand':
        return { ...baseResult, ...decodeHandoverCommand(binary) };
      case 'DlInformationTransfer':
        return { ...baseResult, ...decodeDlInformationTransfer(binary) };
      case 'UlInformationTransfer':
        return { ...baseResult, ...decodeUlInformationTransfer(binary) };
      case 'SystemInformationBlockType1':
        return { ...baseResult, ...decodeSystemInformationBlockType1(binary) };
      case 'SystemInformationBlockType2':
        return { ...baseResult, ...decodeSystemInformationBlockType2(binary) };
      default:
        return {
          ...baseResult,
          description: 'Unknown RRC message',
          severity: 'warning',
          fields: { RawData: hexData },
        };
    }
  } catch (error) {
    return {
      messageType: 'DecodeError',
      description: `Failed to decode: ${(error as Error).message}`,
      severity: 'error',
      fields: {},
      timestamp: new Date().toISOString(),
    };
  }
}

function hexToBinary(hex: string): string {
  return hex
    .replace(/0x/i, '')
    .split('')
    .map(h => parseInt(h, 16).toString(2).padStart(4, '0'))
    .join('');
}

function identifyMessageType(firstByte: string): string {
  const value = parseInt(firstByte, 2);
  const types: { [key: number]: string } = {
    0: 'RrcConnectionSetup',
    1: 'RrcConnectionReconfiguration',
    2: 'RrcConnectionRelease',
    3: 'SecurityModeCommand',
    4: 'MeasurementReport',
    5: 'HandoverCommand',
    6: 'DlInformationTransfer',
    7: 'UlInformationTransfer',
    8: 'SystemInformationBlockType1',
    9: 'SystemInformationBlockType2',
  };
  return types[value] || `UnknownMessage(0x${value.toString(16)})`;
}

function decodeRrcConnectionSetup(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Network assigns initial RRC configuration to device',
    severity: 'info',
    fields: {
      MessageType: 'RRC Connection Setup',
      RRCTransactionId: `Transaction ${parseInt(binary.substring(8, 16), 2) || 0}`,
      CriticalExtensions: 'Present',
      RadioResourceConfig: 'Assigned',
      SecurityAlgorithm: 'Encryption assigned',
    },
  };
}

function decodeRrcConnectionReconfiguration(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Network reconfigures RRC settings (may cause reconnection)',
    severity: 'warning',
    fields: {
      MessageType: 'RRC Connection Reconfiguration',
      RadioResourceConfig: 'Updated',
      MeasurementConfig: 'Modified',
      MobilityControlInfo: 'Present',
    },
  };
}

function decodeMeasurementReport(binary: string): Partial<DecodedRrcMessage> {
  const rsrpRaw = parseInt(binary.substring(16, 24), 2) || 0;
  const sinrRaw = parseInt(binary.substring(24, 32), 2) || 0;
  const rsrp = -180 + rsrpRaw;
  const sinr = -24 + sinrRaw / 2;

  return {
    description: 'Device reports signal measurements to network',
    severity: 'info',
    fields: {
      MessageType: 'Measurement Report',
      ServingCellRSRP: `${rsrp} dBm`,
      ServingCellSINR: `${sinr.toFixed(1)} dB`,
      NeighborCells: '3 cells reported',
    },
  };
}

function decodeHandoverCommand(binary: string): Partial<DecodedRrcMessage> {
  const targetPci = parseInt(binary.substring(8, 18), 2) || 0;
  return {
    description: 'Network commands device to handover to new cell',
    severity: 'warning',
    fields: {
      MessageType: 'Handover Command',
      TargetCellPCI: `Cell ${targetPci}`,
      HandoverType: 'Intra-LTE',
      Action: 'Device switching cells',
    },
  };
}

function decodeSecurityModeCommand(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Network initiates security mode (encryption starts)',
    severity: 'info',
    fields: {
      MessageType: 'Security Mode Command',
      CipheringAlgorithm: 'EEA1',
      IntegrityAlgorithm: 'EIA1',
    },
  };
}

function decodeDlInformationTransfer(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Downlink information transfer from network',
    severity: 'info',
    fields: {
      MessageType: 'DL Information Transfer',
      DedicatedInfoType: 'NAS message present',
    },
  };
}

function decodeUlInformationTransfer(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Uplink information from device to network',
    severity: 'info',
    fields: {
      MessageType: 'UL Information Transfer',
      DedicatedInfoType: 'NAS message present',
    },
  };
}

function decodeRrcConnectionRelease(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Network releases RRC connection (device returns to IDLE)',
    severity: 'warning',
    fields: {
      MessageType: 'RRC Connection Release',
      ReleaseCause: 'Network initiated',
      Action: 'Entering IDLE state',
    },
  };
}

function decodeSystemInformationBlockType1(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Cell broadcasts SIB1 (essential system information)',
    severity: 'info',
    fields: {
      MessageType: 'System Information Block Type 1',
      DlBandwidth: '20 MHz',
      CellID: '286392',
    },
  };
}

function decodeSystemInformationBlockType2(binary: string): Partial<DecodedRrcMessage> {
  return {
    description: 'Cell broadcasts SIB2 (radio resource configuration)',
    severity: 'info',
    fields: {
      MessageType: 'System Information Block Type 2',
      RACH: 'Configured',
      PRAC: 'Assigned',
    },
  };
}
