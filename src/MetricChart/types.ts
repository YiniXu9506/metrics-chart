export type SeriesType = "bar_stacked" | "area_stack" | "line"

export enum ColorType {
  BLUE_1 = "#C0D8FF",
  BLUE_2 = "#8AB8FF",
  BLUE_3 = "#3274D9",
  BLUE_4 = "#1F60C4",
  GREEN_1 = "#C8F2C2",
  GREEN_2 = "#96D98D",
  GREEN_3 = "#56A64B",
  GREEN_4 = "#37872D",
  RED_1 = "#FFA6B0",
  RED_2 = "#FF7383",
  RED_3 = "#E02F44",
  RED_4 = "#C4162A",
  RED_5 = "#701313",
  PURPLE = "#8778ee",
  ORANGE = "#FF9830",
  YELLOW = "#FADE2A",
  PINK = "#F2495C",
}

export enum TransformNullValue {
  NULL = "null",
  AS_ZERO = "as_zero",
}

export type TimeRangeValue = [minSecond: number, maxSecond: number];
export type DataPoint = [msTimestamp: number, value: number | null];
export type QueryData = {
  id: string;
  name: string;
  data: DataPoint[];
  color?: ColorType | ((seriesName: string) => string | undefined);
  type?: SeriesType;
};

export interface QueryOptions {
  step: number;
  start: number;
  end: number;
}

export interface IQueryOption {
  promql: string;
  name: string;
  color?: ColorType | ((seriesName: string) => string | undefined);
  type: SeriesType;
}

/**
 *
 * @export
 * @interface MetricsQueryResponse
 */
export interface MetricsQueryResponse {
  /**
   *
   * @type {object}
   * @memberof MetricsQueryResponse
   */
  data?: object;
  /**
   *
   * @type {string}
   * @memberof MetricsQueryResponse
   */
  status?: string;
}
