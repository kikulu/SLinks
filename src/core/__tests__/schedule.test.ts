import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../types";
import { getAutoUploadAlarmConfig, MIN_AUTO_UPLOAD_INTERVAL_MINUTES } from "../schedule";

describe("getAutoUploadAlarmConfig", () => {
  it("returns null when autoUpload is disabled", () => {
    const settings = { ...DEFAULT_SETTINGS, autoUpload: false, uploadMethod: "drive" as const };
    expect(getAutoUploadAlarmConfig(settings)).toBeNull();
  });

  it("returns null when no upload method has been selected, even if autoUpload is true", () => {
    const settings = { ...DEFAULT_SETTINGS, autoUpload: true, uploadMethod: "none" as const };
    expect(getAutoUploadAlarmConfig(settings)).toBeNull();
  });

  it("returns the configured interval when enabled with a valid upload method", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      autoUpload: true,
      uploadMethod: "sheets" as const,
      autoUploadIntervalMinutes: 60,
    };
    expect(getAutoUploadAlarmConfig(settings)).toEqual({ periodInMinutes: 60 });
  });

  it("clamps intervals shorter than the minimum", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      autoUpload: true,
      uploadMethod: "drive" as const,
      autoUploadIntervalMinutes: 1,
    };
    expect(getAutoUploadAlarmConfig(settings)).toEqual({
      periodInMinutes: MIN_AUTO_UPLOAD_INTERVAL_MINUTES,
    });
  });
});
