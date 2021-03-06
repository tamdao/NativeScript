﻿// Require globals first so that snapshot takes __extends function.
require("globals");

import { Observable, EventData } from "../data/observable";

const events = new Observable();
let launched = false;
function setLaunched() {
    launched = true;
    events.off("launch", setLaunched);
}
events.on("launch", setLaunched);

export function hasLaunched(): boolean {
    return launched;
}

export { Observable };

import { UnhandledErrorEventData, iOSApplication, AndroidApplication, CssChangedEventData } from ".";
import { NavigationEntry } from "../ui/frame";

export const launchEvent = "launch";
export const suspendEvent = "suspend";
export const resumeEvent = "resume";
export const exitEvent = "exit";
export const lowMemoryEvent = "lowMemory";
export const uncaughtErrorEvent = "uncaughtError";
export const orientationChangedEvent = "orientationChanged";

let cssFile: string = "app.css";

export let mainModule: string;
export let mainEntry: NavigationEntry;

export let resources: any = {};

export function setResources(res: any) {
    resources = res;
}

export let android = undefined;
export let ios = undefined;

export const on: typeof events.on = events.on.bind(events);
export const off: typeof events.off = events.off.bind(events);
export const notify: typeof events.notify = events.notify.bind(events);

let app: iOSApplication | AndroidApplication;
export function setApplication(instance: iOSApplication | AndroidApplication): void {
    app = instance;
}

export function livesync() {
    events.notify(<EventData>{ eventName: "livesync", object: app });  
}

export function setCssFileName(cssFileName: string) {
    cssFile = cssFileName;
    events.notify(<CssChangedEventData>{ eventName: "cssChanged", object: app, cssFile: cssFileName });
}

export function getCssFileName(): string {
    return cssFile;
}

export function addCss(cssText: string): void {
    events.notify(<CssChangedEventData>{ eventName: "cssChanged", object: app, cssText: cssText });
}

global.__onUncaughtError = function (error: NativeScriptError) {
    events.notify(<UnhandledErrorEventData>{ eventName: uncaughtErrorEvent, object: app, android: error, ios: error, error: error });
}
