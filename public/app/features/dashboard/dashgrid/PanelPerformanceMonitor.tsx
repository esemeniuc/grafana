import { useEffect, useRef } from 'react';

import { FieldConfigSource } from '@grafana/data';
import { faro } from '@grafana/faro-web-sdk';
import appEvents from 'app/core/app_events';
import { config } from 'app/core/config';
import { FIELD_CONFIG_CUSTOM_KEY, FIELD_CONFIG_OVERRIDES_KEY, PanelLogEvents } from 'app/core/log_events';
import { DashboardSavedEvent } from 'app/types/events';

interface Props {
  isInPanelEdit: boolean;
  panelType: string;
  panelId: number;
  panelTitle: string;
  panelOptions: unknown;
  panelFieldConfig: FieldConfigSource;
}

export const PanelPerformanceMonitor = (props: Props) => {
  const startLoadTime = performance.now();
  const panelIdStr = String(props.panelId);

  const oldPanelOptions = useRef(props.panelOptions);
  const oldPanelFieldConfig = useRef<FieldConfigSource>(props.panelFieldConfig);

  const savedFieldConfig = useRef<FieldConfigSource>(props.panelFieldConfig);
  const savedPanelOptions = useRef(props.panelOptions);

  const logChanges = () => {
    logPanelOptionChanges(savedPanelOptions.current, oldPanelOptions.current);
    logFieldConfigChanges(savedFieldConfig.current, oldPanelFieldConfig.current);

    //set the old values to the current values for next save
    oldPanelOptions.current = savedPanelOptions.current;
    oldPanelFieldConfig.current = savedFieldConfig.current;
  };

  useEffect(() => {
    savedPanelOptions.current = props.panelOptions;
  }, [props.panelOptions]);

  useEffect(() => {
    savedFieldConfig.current = props.panelFieldConfig;
  }, [props.panelFieldConfig]);

  const logPanelEvent = (eventName: string, newKey: string, newVal: string, oldVal?: string) => {
    const logObj = {
      key: newKey,
      newValue: newVal,
      oldValue: oldVal ?? '',
      panelTitle: props.panelTitle,
      panelId: panelIdStr,
      panelType: props.panelType,
    };

    faro.api.pushEvent(eventName, logObj);
  };

  const logPanelOptionChanges = (panelOptions: unknown, oldPanelOptions: unknown) => {
    if (typeof panelOptions !== 'object' || panelOptions === null) {
      return;
    }

    if (typeof oldPanelOptions !== 'object' || oldPanelOptions === null) {
      return;
    }

    const oldPanelOptionsUnknown: { [key: string]: unknown } = { ...oldPanelOptions };

    for (const [key, value] of Object.entries(panelOptions)) {
      const newValue: string = typeof value !== 'string' ? JSON.stringify(value) : value;
      const oldValue: string =
        typeof value !== 'string' ? JSON.stringify(oldPanelOptionsUnknown[key]) : String(oldPanelOptionsUnknown[key]);

      if (oldPanelOptionsUnknown[key] === undefined) {
        logPanelEvent(PanelLogEvents.NEW_PANEL_OPTION_EVENT, key, newValue);
      } else if (oldValue !== newValue) {
        logPanelEvent(PanelLogEvents.PANEL_OPTION_CHANGED_EVENT, key, newValue, oldValue);
      }
    }
  };

  const logFieldConfigChanges = (
    fieldConfig: FieldConfigSource<unknown>,
    oldFieldConfig: FieldConfigSource<unknown>
  ) => {
    // overrides are an array of objects, so stringify it all and log changes
    // in lack of an index, we can't tell which override changed
    if (oldFieldConfig.overrides !== fieldConfig.overrides) {
      logPanelEvent(
        PanelLogEvents.FIELD_CONFIG_OVERRIDES_CHANGED_EVENT,
        FIELD_CONFIG_OVERRIDES_KEY,
        JSON.stringify(fieldConfig.overrides),
        JSON.stringify(oldFieldConfig.overrides)
      );
    }

    const oldDefaults: { [key: string]: unknown } = { ...oldFieldConfig.defaults };

    // go through field config keys except custom, we treat that below
    for (const [key, value] of Object.entries(fieldConfig.defaults)) {
      if (key === FIELD_CONFIG_CUSTOM_KEY) {
        continue;
      }

      const newValue: string = typeof value !== 'string' ? JSON.stringify(value) : value;
      const oldValue: string = typeof value !== 'string' ? JSON.stringify(oldDefaults[key]) : String(oldDefaults[key]);

      if (oldDefaults[key] === undefined) {
        logPanelEvent(PanelLogEvents.NEW_DEFAULT_FIELD_CONFIG_EVENT, key, newValue);
      } else if (oldValue !== newValue) {
        logPanelEvent(PanelLogEvents.DEFAULT_FIELD_CONFIG_CHANGED_EVENT, key, newValue, oldValue);
      }
    }

    if (!fieldConfig.defaults.custom || oldDefaults.custom === undefined) {
      return;
    }

    const oldCustom: { [key: string]: unknown } = { ...oldDefaults.custom };

    // go through custom field config keys
    for (const [key, value] of Object.entries(fieldConfig.defaults.custom)) {
      if (oldDefaults.custom === null || oldCustom[key] === null) {
        continue;
      }

      const newValue: string = typeof value !== 'string' ? JSON.stringify(value) : value;
      const oldValue: string = typeof value !== 'string' ? JSON.stringify(oldCustom[key]) : String(oldCustom[key]);

      if (oldCustom[key] === undefined) {
        logPanelEvent(PanelLogEvents.NEW_CUSTOM_FIELD_CONFIG_EVENT, key, newValue);
      } else if (oldValue !== newValue) {
        logPanelEvent(PanelLogEvents.CUSTOM_FIELD_CONFIG_CHANGED_EVENT, key, newValue, oldValue);
      }
    }
  };

  useEffect(() => {
    if (!config.grafanaJavascriptAgent.enabled) {
      return;
    }

    // This code will be run ASAP after Style and Layout information have
    // been calculated and the paint has occurred.
    // https://firefox-source-docs.mozilla.org/performance/bestpractices.html
    requestAnimationFrame(() => {
      setTimeout(() => {
        faro.api.pushMeasurement(
          {
            type: PanelLogEvents.MEASURE_PANEL_LOAD_TIME_EVENT,
            values: {
              start_loading_time_ms: startLoadTime,
              load_time_ms: performance.now() - startLoadTime,
            },
          },
          {
            context: {
              panel_type: props.panelType,
            },
          }
        );
      }, 0);
    });

    //we don't want to sub for every panel in dashboard, only for one in edit
    if (props.isInPanelEdit) {
      const sub = appEvents.subscribe(DashboardSavedEvent, logChanges);

      return () => {
        //exiting panel edit mode or changing panel type will auto log changes and unsub
        logChanges();
        sub.unsubscribe();
      };
    }

    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
