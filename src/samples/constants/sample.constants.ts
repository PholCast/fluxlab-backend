export const FIELD_DATA_TYPES = ['text', 'number', 'date', 'boolean'] as const;
export type FieldDataType = (typeof FIELD_DATA_TYPES)[number];

export const SAMPLE_STATUSES = ['pending', 'completed', 'rejected'] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];
