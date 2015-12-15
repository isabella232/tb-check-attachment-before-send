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
  utils.log('params', gParams);

  if (utils.getMyPref('disableAcceptUntilChecked')) {
    let acceptButton = document.documentElement.getButton('accept');
    acceptButton.disabled = true;
  }
}

function onAccept() {
  utils.log('accepted');
  gParams.confirmed = true;
  window.close();
}

function onCancel() {
  utils.log('canceled');
  window.close();
}
