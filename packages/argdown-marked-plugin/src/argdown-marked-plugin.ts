import {
  IArgdownRequest,
  WebComponentExportPlugin,
  IWebComponentExportSettings
} from "@argdown/core";
import defaultsDeep from "lodash.defaultsdeep";
import { argdown } from "@argdown/core/dist/argdown";

export const addArgdownSupportToMarked = (
  markedFn: (src: string, options?: marked.MarkedOptions | undefined) => string,
  renderer: marked.Renderer,
  config?: ((options: any) => IArgdownRequest) | IArgdownRequest
) => {
  const webComponentPlugin = argdown.getPlugin(
    WebComponentExportPlugin.name,
    "export-web-component"
  ) as WebComponentExportPlugin;
  let currentConfig: IArgdownRequest =
    !config || typeof config === "function" ? {} : config;
  const webComponentDefaults = webComponentPlugin.defaults;
  let pluginSettings: IWebComponentExportSettings = {};

  const generateWebComponent = (code: string, initialView?: string) => {
    const request: IArgdownRequest = defaultsDeep(
      {
        input: code,
        process: [
          "parse-input",
          "build-model",
          "build-map",
          "transform-closed-groups",
          "colorize",
          "export-dot",
          "export-svg",
          "highlight-source",
          "export-web-component"
        ],
        webComponent: {
          addGlobalStyles: false,
          addWebComponentPolyfill: false,
          addWebComponentScript: false,
          initialView: initialView || "map"
        }
      },
      currentConfig
    );
    const response = argdown.run(request);
    return response.webComponent;
  };
  const tempCode = renderer.code.bind(renderer as any); // could not find out the required type of Renderer<T> here
  renderer.code = (
    code: string,
    language: string | undefined,
    isEscaped: boolean
  ) => {
    if (language === "argdown-map") {
      return generateWebComponent(code.trim(), "map") || "";
    } else if (language === "argdown") {
      return generateWebComponent(code.trim(), "source") || "";
    }
    return tempCode(code, language, isEscaped);
  };
  return (src: string, options?: marked.MarkedOptions | undefined) => {
    if (typeof config === "function") {
      currentConfig = config(options);
    }
    currentConfig.webComponent = currentConfig.webComponent || {};
    pluginSettings = defaultsDeep(
      {},
      currentConfig.webComponent,
      webComponentDefaults
    );

    let script = "";
    let styles = "";
    let polyfill = "";
    if (pluginSettings.addWebComponentScript) {
      script = `<script src="${pluginSettings.webComponentScriptUrl}"></script>`;
    }
    if (pluginSettings.addGlobalStyles) {
      styles = `<link rel="stylesheet" type="text/css" href="${pluginSettings.globalStylesUrl}">`;
    }
    if (pluginSettings.addWebComponentPolyfill) {
      polyfill = `<script src="${pluginSettings.webComponentPolyfillUrl}" type="module"></script>`;
    }
    return `${script}${styles}${polyfill}${markedFn(src, {
      ...options,
      renderer
    })}`;
    return markedFn(src, { ...options, renderer });
  };
};
