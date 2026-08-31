!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src="https://us-assets.i.posthog.com/static/1/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init("sTMFPsFhdP1Ssg", {
    api_host: "https://internal-c.posthog.com",
    ui_host: "https://us.posthog.com",
    asset_host: "https://us-assets.i.posthog.com",
    strict_script_versioning: true,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    cookie_persisted_properties: ['prod_interest'],
    uuid_version:'v7',
    session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
            password: true,
        },
    },
    error_tracking: {
        __capturePostHogExceptions: true,
    },
    // Drop exceptions coming from local dev servers so developers' local
    // exceptions (e.g. Gatsby dev-server ChunkLoadErrors on hot recompiles)
    // don't pollute production error tracking. Real users are never on localhost.
    before_send: function (event) {
        var hostname = window.location.hostname
        if (event && event.event === '$exception' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
            return null
        }
        return event
    },
    person_profiles: 'identified_only',
    __preview_heatmaps: true,
    opt_in_site_apps: true,
    __preview_remote_config: true,
    __preview_flags_v2: true,
    __preview_lazy_load_replay: true,
    __preview_capture_bot_pageviews: true,
    __preview_disable_xhr_credentials: true,
    // Tune rageclick detection to cut false positives from toggles and other
    // flip-to-see controls: require 4 rapid clicks (default 3) within 750ms of
    // each other (default 1000ms) before treating a burst as a $rageclick.
    rageclick: {
        click_count: 4,
        timeout_ms: 750,
    },
})