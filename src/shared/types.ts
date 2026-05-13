export type ModuleArea = "protocol" | "audio" | "analysis" | "ui" | "visualization";

export interface SystemStatus {
  label: string;
  detail: string;
}

export interface ParameterValue {
  label: string;
  value: string;
}

export interface WorkbenchModel {
  status: SystemStatus;
  encodingParameters: ParameterValue[];
  decodingParameters: ParameterValue[];
}
