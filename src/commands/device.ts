/**
 * @file device.ts
 * @summary Device API Command Pack for the Invokers library.
 * @description
 * This module provides commands for interacting with device APIs including
 * vibration, geolocation, battery status, clipboard, wake lock, and more.
 * These commands enable rich device integration with proper permission handling.
 *
 * @example
 * ```javascript
 * import { registerDeviceCommands } from 'invokers/commands/device';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerDeviceCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Device API commands for hardware and sensor integration.
 * Includes vibration, geolocation, battery, clipboard, and wake lock functionality.
 */
const deviceCommands: Record<string, CommandCallback> = {

  /**
   * `--device:vibrate`: Triggers device vibration with specified pattern.
   * @example `<button command="--device:vibrate:200" commandfor="#status">Vibrate</button>`
   * @example `<button command="--device:vibrate:100:200:100">Pattern Vibrate</button>`
   */
  "--device:vibrate": async ({ invoker, params }: CommandContext) => {
    const pattern = params.slice(0);
    if (pattern.length === 0) {
      throw createInvokerError(
        'Device vibrate requires a pattern',
        ErrorSeverity.ERROR,
        {
          command: '--device:vibrate',
          element: invoker,
          recovery: 'Use --device:vibrate:200 or --device:vibrate:100:200:100'
        }
      );
    }

    if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
      console.warn('Invokers: Vibration API not supported');
      return;
    }

    const vibrationPattern = pattern.length === 1 ? parseInt(pattern[0], 10) : pattern.map(n => parseInt(n, 10));
    const vibrateResult = (navigator as any).vibrate(vibrationPattern);

    if (!vibrateResult) {
      console.warn('Invokers: Vibration failed - may be blocked or not supported');
    }
  },

  /**
   * `--device:share`: Shares content using the Web Share API.
   * @example `<button command="--device:share:title:My Title:text:Check this out:url:https://example.com">Share</button>`
   */
  "--device:share": async ({ params }: CommandContext) => {
    if (!('share' in navigator) || typeof (navigator as any).share !== 'function') {
      console.warn('Invokers: Web Share API not supported');
      return;
    }

    const shareData: ShareData = {};
    // Parse key:value pairs
    for (let i = 0; i < params.length; i += 2) {
      const key = params[i];
      const val = params[i + 1];
      if (key && val !== undefined) {
        if (key === 'url') shareData.url = val;
        else if (key === 'text') shareData.text = val;
        else if (key === 'title') shareData.title = val;
      }
    }

    try {
      await (navigator as any).share(shareData);
      // Dispatch success event
      document.dispatchEvent(new CustomEvent('device:share:success'));
    } catch (shareError) {
      // User cancelled or error occurred
      document.dispatchEvent(new CustomEvent('device:share:cancelled', {
        detail: shareError
      }));
    }
  },

  /**
   * `--device:geolocation:get`: Gets current geolocation with permission handling.
   * @example `<button command="--device:geolocation:get" commandfor="#location-display" data-geo-high-accuracy="true">Get Location</button>`
   */
  "--device:geolocation:get": async ({ invoker, getTargets }: CommandContext) => {
    if (!('geolocation' in navigator) || typeof navigator.geolocation?.getCurrentPosition !== 'function') {
      throw createInvokerError(
        'Geolocation API not supported',
        ErrorSeverity.ERROR,
        {
          command: '--device:geolocation:get',
          element: invoker,
          recovery: 'Geolocation requires HTTPS and user permission'
        }
      );
    }

    // Helper function to request permissions
    const requestPermission = async (permissionName: string): Promise<boolean> => {
      if ('permissions' in navigator) {
        try {
          const permission = await (navigator as any).permissions.query({ name: permissionName });
          return permission.state === 'granted';
        } catch {
          return false;
        }
      }
      return true; // Assume granted if permissions API not available
    };

    const hasGeoPermission = await requestPermission('geolocation');
    if (!hasGeoPermission) {
      console.warn('Invokers: Geolocation permission not granted');
      document.dispatchEvent(new CustomEvent('device:geolocation:denied'));
      return;
    }

    const targets = getTargets();
    const geoOptions: PositionOptions = {
      enableHighAccuracy: invoker?.dataset?.geoHighAccuracy === 'true',
      timeout: parseInt(invoker?.dataset?.geoTimeout || '10000'),
      maximumAge: parseInt(invoker?.dataset?.geoMaxAge || '0')
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        };
        if (targets.length > 0) {
          targets[0].textContent = JSON.stringify(data);
        }
        // Dispatch success event
        document.dispatchEvent(new CustomEvent('device:geolocation:success', { detail: data }));
      },
      (error) => {
        const errorData = {
          code: error.code,
          message: error.message
        };
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('device:geolocation:error', { detail: errorData }));
      },
      geoOptions
    );
  },

  /**
   * `--device:orientation:get`: Gets current device orientation.
   * @example `<button command="--device:orientation:get" commandfor="#orientation-display">Get Orientation</button>`
   */
  "--device:orientation:get": ({ getTargets }: CommandContext) => {
    if (!window.DeviceOrientationEvent) {
      console.warn('Invokers: Device Orientation API not supported');
      return;
    }

    const targets = getTargets();
    // Get current orientation if available
    const orientation = (window as any).screen?.orientation || (window as any).orientation;
    const orientationData = {
      angle: orientation?.angle || 0,
      type: orientation?.type || 'unknown'
    };

    if (targets.length > 0) {
      targets[0].textContent = JSON.stringify(orientationData);
    }

    // Dispatch event
    document.dispatchEvent(new CustomEvent('device:orientation:current', { detail: orientationData }));
  },

  /**
   * `--device:motion:get`: Checks device motion API support and permissions.
   * @example `<button command="--device:motion:get" commandfor="#motion-display">Check Motion</button>`
   */
  "--device:motion:get": async ({ getTargets }: CommandContext) => {
    if (!window.DeviceMotionEvent) {
      console.warn('Invokers: Device Motion API not supported');
      return;
    }

    const targets = getTargets();

    // Request permission for iOS 13+
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          console.warn('Invokers: Device motion permission denied');
          return;
        }
      } catch {
        console.warn('Invokers: Failed to request device motion permission');
        return;
      }
    }

    // Note: Actual motion data requires event listeners, this just confirms support
    const motionSupported = true;
    if (targets.length > 0) {
      targets[0].textContent = JSON.stringify({ supported: motionSupported });
    }
  },

  /**
   * `--device:battery:get`: Gets battery status information.
   * @example `<button command="--device:battery:get" commandfor="#battery-display">Check Battery</button>`
   */
  "--device:battery:get": async ({ getTargets }: CommandContext) => {
    if (!('getBattery' in navigator) || typeof (navigator as any).getBattery !== 'function') {
      console.warn('Invokers: Battery API not supported');
      return;
    }

    const targets = getTargets();

    try {
      const battery = await (navigator as any).getBattery();
      const data = {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
      if (targets.length > 0) {
        targets[0].textContent = JSON.stringify(data);
      }
      // Dispatch event
      document.dispatchEvent(new CustomEvent('device:battery:status', { detail: data }));
    } catch (batteryError) {
      console.warn('Invokers: Failed to get battery status', batteryError);
    }
  },

  /**
   * `--device:clipboard:read`: Reads text from the clipboard.
   * @example `<button command="--device:clipboard:read" commandfor="#clipboard-input">Read Clipboard</button>`
   */
  "--device:clipboard:read": async ({ getTargets }: CommandContext) => {
    if (!navigator.clipboard?.readText) {
      console.warn('Invokers: Clipboard read not supported');
      return;
    }

    const targets = getTargets();

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (targets.length > 0) {
        if ('value' in targets[0]) {
          (targets[0] as HTMLInputElement).value = clipboardText;
        } else {
          targets[0].textContent = clipboardText;
        }
      }
      document.dispatchEvent(new CustomEvent('device:clipboard:read', { detail: clipboardText }));
    } catch (clipboardError) {
      console.warn('Invokers: Clipboard read failed', clipboardError);
      document.dispatchEvent(new CustomEvent('device:clipboard:denied'));
    }
  },

  /**
   * `--device:clipboard:write`: Writes text to the clipboard.
   * @example `<button command="--device:clipboard:write:Hello World">Copy Text</button>`
   */
  "--device:clipboard:write": async ({ invoker, params }: CommandContext) => {
    if (!navigator.clipboard?.writeText) {
      console.warn('Invokers: Clipboard write not supported');
      return;
    }

    const textToWrite = params.join(':');
    if (!textToWrite) {
      throw createInvokerError(
        'Clipboard write requires text to copy',
        ErrorSeverity.ERROR,
        {
          command: '--device:clipboard:write',
          element: invoker,
          recovery: 'Use --device:clipboard:write:text-to-copy'
        }
      );
    }

    try {
      await navigator.clipboard.writeText(textToWrite);
      document.dispatchEvent(new CustomEvent('device:clipboard:written', { detail: textToWrite }));
    } catch (clipboardError) {
      console.warn('Invokers: Clipboard write failed', clipboardError);
      document.dispatchEvent(new CustomEvent('device:clipboard:denied'));
    }
  },

  /**
   * `--device:wake-lock`: Requests a wake lock to keep screen awake.
   * @example `<button command="--device:wake-lock">Keep Screen Awake</button>`
   */
  "--device:wake-lock": async (): Promise<void> => {
    if (!('wakeLock' in navigator) || typeof (navigator as any).wakeLock?.request !== 'function') {
      console.warn('Invokers: Wake Lock API not supported');
      return;
    }

    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      // Store wake lock for potential release
      (window as any)._invokersWakeLock = wakeLock;

      document.dispatchEvent(new CustomEvent('device:wake-lock:acquired'));
    } catch (wakeError) {
      console.warn('Invokers: Wake lock request failed', wakeError);
      document.dispatchEvent(new CustomEvent('device:wake-lock:denied'));
    }
  },

  /**
   * `--device:wake-lock:release`: Releases the current wake lock.
   * @example `<button command="--device:wake-lock:release">Release Wake Lock</button>`
   */
  "--device:wake-lock:release": (): void => {
    if ((window as any)._invokersWakeLock) {
      (window as any)._invokersWakeLock.release();
      delete (window as any)._invokersWakeLock;
      document.dispatchEvent(new CustomEvent('device:wake-lock:released'));
    }
  }
};

/**
 * Registers all device API commands with the InvokerManager.
 * This includes vibration, geolocation, battery, clipboard, and wake lock functionality.
 *
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerDeviceCommands } from 'invokers/commands/device';
 * import invokerManager from 'invokers';
 *
 * registerDeviceCommands(invokerManager);
 * ```
 */
export function registerDeviceCommands(manager: InvokerManager): void {
  for (const name in deviceCommands) {
    if (deviceCommands.hasOwnProperty(name)) {
      manager.register(name, deviceCommands[name]);
    }
  }
}