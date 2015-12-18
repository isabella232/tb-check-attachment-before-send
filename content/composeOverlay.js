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

  get confirmationTargetMatcher() {
    if ('_cachedConfirmationTargetMatcher' in this)
      return this._cachedConfirmationTargetMatcher;

    var pattern = utils.getMyPref('confirmationTargetMatcher') || '';
    if (!pattern)
      return this._cachedConfirmationTargetMatcher = null;

    pattern = pattern.trim();
    try {
      pattern = new RegExp(pattern, 'i');
    }
    catch(e) {
      Cu.reportError(e);
      pattern = null;
    }
    return this._cachedConfirmationTargetMatcher = pattern;
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
    delete this._cachedConfirmationTargetMatcher;
    this.lastConfirmed = false;

    if (!this.hasAttachment) {
      utils.log('No attachment.');
      return true;
    }

    if (this.confirmationTargetMatcher &&
        !this.confirmationTargetMatcher.test(this.body.textContent.replace(/\s+/g, '')) &&
        !this.confirmationTargetMatcher.test(this.subject)) {
      utils.log('Not matched to the confirmation pattern.', this.confirmationTargetMatcher.source);
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
      body:       this.body.cloneNode(true),
      opener:     window
    };
    window.openDialog('chrome://check-attachment-before-send/content/confirm.xul',
                      'check-attachment-before-send',
                      'resizable,chrome,modal,titlebar,centerscreen',
                      params);
    return this.lastConfirmed = params.confirmed;
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

  doPostProcess: function(aCallback) {
    if (typeof window.CheckAndSend === 'function') {
      let prefixedName = '__checkattachmentbeforesend__confirmSend';
      if (typeof CheckAndSend.prototype[prefixedName] !== 'function') {
        CheckAndSend.prototype[prefixedName] = CheckAndSend.prototype.confirmSend;
        let self = this;
        CheckAndSend.prototype.confirmSend = function(...aArgs) {
          if (utils.getMyPref('bypassConfirmationByOthers') &&
              self.lastConfirmed) {
            return true;
          }
          else {
            return CheckAndSend.prototype[prefixedName].apply(this, aArgs);
          }
        };
      }
    }
    aCallback();
  },

  openAllAttachments: function() {
    var attachmentsBacket = GetMsgAttachmentElement();
    for (let attachmentItem of attachmentsBacket.childNodes) {
      this.openAttachment(attachmentItem.attachment);
    }
  },

  messagePrefixMatcher: /^mailbox-message:|^imap-message:|^news-message:/i,
  openAttachment: function(aAttachment) {
    var url = aAttachment.url;
    if (this.messagePrefixMatcher.test(url))
      this.openAttachedMessage(aAttachment);
    else
      this.openAttachedFile(aAttachment);
  },

  openAttachedMessage: function(aAttachment) {
    var url = aAttachment.url;
    var msgHdr = gMessenger.messageServiceFromURI(url).messageURIToMsgHdr(url);
    if (msgHdr)
      MailUtils.openMessageInNewWindow(msgHdr);
    else
      utils.log('failed to open attached message: ' + url);
  },

  openAttachedFile: function(aAttachment) {
    let url = aAttachment.url;
    url = Services.io.newURI(url, null, null);
    url = url.QueryInterface(Ci.nsIURL);
    if (!url) {
      utils.log('failed to open attached file: ' + aAttachment.url);
      rerurn;
    }

    if (url.scheme == 'file') {
      url.QueryInterface(Ci.nsIFileURL).file.launch();
    }
    else {
      let channel = Services.io.newChannelFromURI(url);
      if (channel) {
        let loader = Cc['@mozilla.org/uriloader;1']
                       .getService(Ci.nsIURILoader);
        loader.openURI(channel, true, new nsAttachmentOpener());
      }
      else {
        utils.log('failed to create channel for the attached file: ' + url.spec);
      }
    }
  }
};
window.CheckAttachmentBeforeSendHelper = CheckAttachmentBeforeSendHelper;

window.addEventListener('load', function CheckAttachmentBeforeSendOnLoad(aEvent) {
  window.removeEventListener(aEvent.type, CheckAttachmentBeforeSendOnLoad, false);

  window.__checkattachmentbeforesend__SendMessage = window.SendMessage;
  window.SendMessage = function SendMessage(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    CheckAttachmentBeforeSendHelper.doPostProcess((function() {
      window.__checkattachmentbeforesend__SendMessage.apply(this, aArgs);
    }).bind(this));
  };

  window.__checkattachmentbeforesend__SendMessageWithCheck = window.SendMessageWithCheck;
  window.SendMessageWithCheck = function SendMessageWithCheck(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    CheckAttachmentBeforeSendHelper.doPostProcess((function() {
      window.__checkattachmentbeforesend__SendMessageWithCheck.apply(this, aArgs);
    }).bind(this));
  };

  window.__checkattachmentbeforesend__SendMessageLater = window.SendMessageLater;
  window.SendMessageLater = function SendMessageLater(...aArgs) {
    if (!CheckAttachmentBeforeSendHelper.confirm()) {
      return;
    }
    CheckAttachmentBeforeSendHelper.doPostProcess((function() {
      window.__checkattachmentbeforesend__SendMessageLater.apply(this, aArgs);
    }).bind(this));
  };
}, false);

})();
