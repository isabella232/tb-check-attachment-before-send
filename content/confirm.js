/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var { CheckAttachmentBeforeSendUtils: utils } = Cu.import('resource://check-attachment-before-send-modules/utils.js', {});

function getMessage(aKey) {
  var bundle = document.getElementById('messages');
  return bundle.getString(aKey);
}

var gParams;

function onLoad() {
  gParams = window.arguments[0];
//  utils.log('params', gParams);

  var bodyField = document.getElementById('body');
  bodyField.contentDocument.documentElement.appendChild(gParams.body);

  gParams.recipients.to.forEach(addRecipientItem);
  gParams.recipients.cc.forEach(addRecipientItem);
  gParams.recipients.bcc.forEach(addRecipientItem);

  checkAllRecipientsVerified();

  if (utils.getMyPref('openAllAttachments'))
    gParams.opener.CheckAttachmentBeforeSendHelper.openAllAttachments();
}

function addRecipientItem(aRecipient) {
  var label = createRecipientLabel(aRecipient);

  var item = document.createElement('listitem');
  item.setAttribute('tooltiptext', foldLongTooltipText(label));

  var cell = document.createElement('listcell');
  var checkbox = document.createElement('checkbox');
  checkbox.setAttribute('label', label);

  cell.appendChild(checkbox);
  item.appendChild(cell);

  document.getElementById('recipients').appendChild(item);
}

function createRecipientLabel(aRecipient) {
  var typePrefix = aRecipient.type + ': ';
  if (aRecipient.name && aRecipient.name != aRecipient.address) {
    return typePrefix + aRecipient.name + ' <' + aRecipient.address + '>';
  }
  return typePrefix + (aRecipient.fullName || aRecipient.address);
}

var maxTooltipTextLength = 60;
function foldLongTooltipText(aText) {
  var folded = [];
  while (aText.length > 0) {
    folded.push(aText.substring(0, maxTooltipTextLength));
    aText = aText.substring(maxTooltipTextLength);
  }
  return folded.join('\n');
}

function onRecipientClick(aEvent) {
  var target = aEvent.target;
  var checkbox = document.evaluate(
        'ancestor-or-self::*[local-name()="listitem"]/descendant::*[local-name()="checkbox"]',
        aEvent.target,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
    checkAllRecipientsVerified();
  }
}

function isAllRecipientsVerified() {
  return Array.every(document.querySelectorAll('checkbox'), function(aCheckbox) {
    return aCheckbox.checked;
  });
}

function checkAllRecipientsVerified() {
  if (!utils.getMyPref('disableAcceptUntilChecked')) {
    return;
  }

  let acceptButton = document.documentElement.getButton('accept');
  acceptButton.disabled = !isAllRecipientsVerified();
}

function onAccept() {
  if (!isAllRecipientsVerified()) {
    let prompt = Cc['@mozilla.org/embedcomp/prompt-service;1']
                   .getService(Ci.nsIPromptService);
    prompt.alert(window, getMessage('notVerifiedYet.title'), getMessage('notVerifiedYet.text'));
    return false;
  }
  utils.log('accepted');
  gParams.confirmed = true;
  window.close();
}

function onCancel() {
  utils.log('canceled');
  window.close();
}
