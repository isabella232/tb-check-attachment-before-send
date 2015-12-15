/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Cc = Components.classes;
var Ci = Components.interfaces;

function getMessage(aKey) {
  var bundle = document.getElementById('messages');
  return bundle.getString(aKey);
}

var gParams;

function onLoad() {
  gParams = window.arguments[0];
}

function onAccept() {
  gParams.confirmed = true;
  window.close();
}

function onCancel() {
  window.close();
}
