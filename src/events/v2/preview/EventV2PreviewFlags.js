'use strict';

const EVENT_V2_PREVIEW_FLAGS = Object.freeze({
  eventV2AssetsEnabled: true,
  eventV2PreviewEnabled: true,
  eventV2ShadowFeedEnabled: true,
  eventV2EventCenterPreviewEnabled: false,
  eventV2RuntimeShadowEnabled: false,
  eventV2RuntimeWriteEnabled: false,
  eventV2ProductionEnabled: false,
});

function getEventV2PreviewFlags() {
  return EVENT_V2_PREVIEW_FLAGS;
}

module.exports = Object.freeze({
  EVENT_V2_PREVIEW_FLAGS,
  getEventV2PreviewFlags,
});
