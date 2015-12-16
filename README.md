# Check Attachment before Send

This provides ability to confirm that the mail is really safe to be sent, before sending.
When *ALL* of following conditions are satisfied, a confirmation dialog will be shown:

 * The sending mail has one or more attachments.
 * There are one or more recipients which are not matched to the list of "Exceptional domains".
 * No matching regular expression is given, or the subject or the body match to the given regexp.

Until you verify all recipients are correct, you cannot send the mail actually.

## Bypassing of confirmation dialogs provided by other addons

There are some addons similar to this.
When you use them with this addon, you'll see similar confirmations again and again.
To avoid such an annoying result, this provides ability to bypass other confirmations if you confirmed with this addon.

Currently this supports bypassing for only following addons:

 * [Check and Send](https://addons.mozilla.org/thunderbird/addon/check-and-send/)
