/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var MimeHeaderParser = Cc['@mozilla.org/messenger/headerparser;1']
                         .getService(Ci.nsIMsgHeaderParser);

var { CheckAttachmentBeforeSendUtils: utils } = Cu.import('resource://check-attachment-before-send-modules/utils.js', {});

var CheckAttachmentBeforeSendHelper = {
  get ignoredDomains() {
    if (this._cachekdIgnoredDomains)
      return this._cachekdIgnoredDomains;

    var domains = utils.getMyPref('ignoreDomains') || '';
    if (!domains)
      return this._cachekdIgnoredDomains = [];

    domains = domains.replace(/^[,|]|[,|]$/g, '').split(/\s*[,|]\s*|\s+/);
    return this._cachekdIgnoredDomains = domains.filter(function(aDomain) {
      return aDomain.trim() !== '';
    });
  },

  get confirmationPattern() {
    if (this._cachedConfirmationPattern)
      return this._cachedConfirmationPattern;

    var pattern = utils.getMyPref('confirmationPattern') || '';
    if (!pattern)
      return this._cachedConfirmationPattern = null;

    pattern = pattern.trim();
    return this._cachedConfirmationPattern = new RegExp(pattern, 'i');
  },

  get hasAttachment() {
    var attachmentsBacket = GetMsgAttachmentElement();
    var attachmentsCount = attachmentsBacket.itemCount;
    return attachmentsCount > 0;
  },

  get body() {
    var holderNode = gMsgCompose.editor.document.body ||
                 gMsgCompose.editor.document.documentElement;
    return holderNode;
  },

  get subject() {
    return document.getElementById('msgSubject').value;
  },

  confirm: function() {
    // clear cache
    delete this._cachekdIgnoredDomains;
    delete this._cachedConfirmationPattern;

    if (!this.hasAttachment) {
      utils.log('No attachment.');
      return true;
    }

    if (this.confirmationPattern &&
        !this.confirmationPattern.test(this.body.textContent.replace(/\s+/g, '')) &&
        !this.confirmationPattern.test(this.subject)) {
      utils.log('Not matched to the confirmation pattern.', this.confirmationPattern.source);
      return true;
    }

    var recipients = this.getAllRecipients();
    if (recipients.to.length + recipients.cc.length + recipients.bcc.length === 0) {
      utils.log('No external recipient.');
      return true;
    }
    utils.log('External recipients are detected: ', recipients);

    var params = {
      confirmed:  false,
      recipients: recipients,
      body:       this.body.cloneNode(true)
    };
    window.openDialog('chrome://check-attachment-before-send/content/confirm.xul',
                      'check-attachment-before-send',
                      'resizable,chrome,modal,titlebar,centerscreen',
                      window,
                      params);
    return params.confirmed;
  },

  getAllRecipients: function() {
    var msgCompFields = gMsgCompose.compFields;
    Recipients2CompFields(msgCompFields);
    gMsgCompose.expandMailingLists();

    return {
      to:  this.splitRecipients(msgCompFields.to, 'To'),
      cc:  this.splitRecipients(msgCompFields.cc, 'Cc'),
      bcc: this.splitRecipients(msgCompFields.bcc, 'Bcc')
    };
  },

  splitRecipients: function(aAddressesSource, aType){
    var addresses = {};
    var names = {};
    var fullNames = {};
    var numAddresses = MimeHeaderParser.parseHeadersWithArray(
                         aAddressesSource, addresses, names, fullNames);
    var recipients = [];
    for (let i = 0; i < numAddresses; i++) {
      let address = addresses.value[i];
      let domain = address.split('@')[1];
      if (this.ignoredDomains.indexOf(domain) > -1)
        continue;
      recipients.push({
        address:  address,
        name:     names.value[i],
        fullName: fullNames.value[i],
        type:     aType
      });
    }
    return recipients;
  },
};
window.CheckAttachmentBeforeSendHelper = CheckAttachmentBeforeSendHelper;

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

})();
