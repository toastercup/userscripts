// ==UserScript==
// @name         AWS GameCast Auto Refresh and Time Range Selector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-refresh and automatically apply time-range filters on AWS GameCast Stream Group pages.
// @author       toastercup
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/toastercup/userscripts/refs/heads/main/aws-gamecast-auto-refresh-and-time-range-selector/aws-gamecast-auto-refresh-and-time-range-selector.user.js
// @downloadURL  https://raw.githubusercontent.com/toastercup/userscripts/refs/heads/main/aws-gamecast-auto-refresh-and-time-range-selector/aws-gamecast-auto-refresh-and-time-range-selector.user.js
// @homepageURL  https://github.com/toastercup/userscripts/aws-gamecast-auto-refresh-and-time-range-selector
// @supportURL   https://github.com/toastercup/userscripts/issues
// @icon         https://console.aws.amazon.com/favicon.ico
// @match        https://*.console.aws.amazon.com/gamecast/stream-groups/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
  'use strict';

  const defaults = {
      refreshIntervalMs: 60 * 1000, // 60 seconds
      waitAfterLoadMs: 3 * 1000, // 3 seconds
      desiredTimeRange: '2-hour', // default time range radio value
  };

  let refreshIntervalMs = GM_getValue('refreshIntervalMs', defaults.refreshIntervalMs);
  let waitAfterLoadMs = GM_getValue('waitAfterLoadMs', defaults.waitAfterLoadMs);
  let desiredTimeRange = GM_getValue('desiredTimeRange', defaults.desiredTimeRange);

  GM_registerMenuCommand(`Set Refresh Interval (current: ${refreshIntervalMs / 1000}s)`, () => {
      const input = prompt('Enter refresh interval in seconds:', refreshIntervalMs / 1000);
      if (input) {
          refreshIntervalMs = parseInt(input, 10) * 1000;
          GM_setValue('refreshIntervalMs', refreshIntervalMs);
          location.reload();
      }
  });

  GM_registerMenuCommand(`Set Wait after Load (current: ${waitAfterLoadMs / 1000}s)`, () => {
      const input = prompt('Enter wait time after page load in seconds:', waitAfterLoadMs / 1000);
      if (input) {
          waitAfterLoadMs = parseInt(input, 10) * 1000;
          GM_setValue('waitAfterLoadMs', waitAfterLoadMs);
          location.reload();
      }
  });

  GM_registerMenuCommand(`Set Desired Time Range (current: ${desiredTimeRange})`, () => {
      const input = prompt('Enter desired time range radio value (e.g., "30-minute", "1-hour", "2-hour"):', desiredTimeRange);
      if (input) {
          desiredTimeRange = input;
          GM_setValue('desiredTimeRange', desiredTimeRange);
          location.reload();
      }
  });

  // Ensure URL exactly matches /gamecast/stream-groups/{id}, no extra segments
  // Using regular expressions with `@include` is largely deprecated for performance reasons, otherwise we'd just do that and not `@match`.
  if (!/^\/gamecast\/stream-groups\/[^\/]+$/.test(location.pathname)) return;

  function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  function waitForText(selector, text, timeout = 10000) {
      return new Promise((resolve, reject) => {
          const interval = 300;
          let elapsed = 0;

          const check = () => {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                  if (el.textContent.trim() === text) {
                      return resolve(el);
                  }
              }

              elapsed += interval;
              if (elapsed >= timeout) {
                  return reject(new Error(`[AWS GameCast Userscript] Element with text "${text}" not found.`));
              }
              setTimeout(check, interval);
          };
          check();
      });
  }

  function clickRadioByValue(value) {
      const radio = document.querySelector(`input[type="radio"][value="${value}"]`);
      if (radio) {
          radio.click();
          return true;
      } else {
          throw new Error(`[AWS GameCast Userscript] Radio button with value "${value}" not found.`);
      }
  }

  async function performActions() {
      console.log("[AWS GameCast Userscript] Performing automation actions...");

      try {
          const last2WeeksElement = await waitForText('button', 'Last 2 weeks');
          last2WeeksElement.click();

          clickRadioByValue(desiredTimeRange);

          const applyButton = await waitForText('button', 'Apply');
          applyButton.click();

          let currentElement = last2WeeksElement;
          while (currentElement && currentElement !== document.body) {
              if ([...currentElement.classList].some(cls => cls.startsWith('awsui_content-wrapper'))) {
                  currentElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                  break;
              }
              currentElement = currentElement.parentElement;
          }
      } catch (error) {
          console.error("[AWS GameCast Userscript] Error:", error);
      }
  }

  setTimeout(async () => {
      await performActions();
  }, waitAfterLoadMs);

  setTimeout(() => {
      location.reload();
  }, refreshIntervalMs);
})();
