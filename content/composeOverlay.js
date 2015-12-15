/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var CheckAttachmentBeforeSendHelper = {
  confirm: function() {
    return true;
  }
};

window.addEventListener('load', function CheckAttachmentBeforeSendOnLoad(aEvent) {
  window.removeEventListener(aEvent.type, CheckAttachmentBeforeSendOnLoad, false);

  window.__checkattachmentbeforesend__SendMessage = window.SendMessage;
  window.SendMessage = function SendMessage(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    window.__checkattachmentbeforesend__SendMessage.apply(this, aArgs);
  };

  window.__checkattachmentbeforesend__SendMessageWithCheck = window.SendMessageWithCheck;
  window.SendMessageWithCheck = function SendMessageWithCheck(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    window.__checkattachmentbeforesend__SendMessageWithCheck.apply(this, aArgs);
  };

  window.__checkattachmentbeforesend__SendMessageLater = window.SendMessageLater;
  window.SendMessageLater = function SendMessageLater(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    window.__checkattachmentbeforesend__SendMessageLater.apply(this, aArgs);
  };
}, false);
