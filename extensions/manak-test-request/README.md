# QE Manak Test Request (Chrome / Edge)

Unpacked browser extension. It opens
[Generate Test Request](https://www.manakonline.in/MANAK/testRequestGenerationForApplicant),
fills fields from a Consultancy Pro sample, waits for **you to type captcha**,
then continues Generate / Sample Code / PDF. The PDF is sent back and attached
on the sample card.

The extension never solves captcha, never fills OTP, and never clicks Pay.

## Install (unpacked)

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `extensions/manak-test-request`.
5. If the extension was already installed, click **Reload** after every pull.

## Daily use

1. In Consultancy Pro, fill the sample (including QR Code if you already have one).
2. Click the **Open Manak** icon on that sample card.
3. If Manak asks to log in, type **captcha only**. After captcha the extension signs in and opens Test Request.
4. On the Test Request page it fills IS Number → Search → Select, then the remaining fields.
5. Type **captcha only** if the form shows one. Generate / Submit continues automatically.
6. Sample Code is written back to that sample.
7. When Manak offers the Test Request PDF, it downloads and **Attach Test Request** fills automatically.
8. Click **Save** in Consultancy Pro.

## Limits

- Only this extension, running on `manakonline.in`, can fill Manak fields.
- Captcha and OTP stay manual. Payment buttons are never clicked.
- If Manak HTML changes, update `field-map.js` selectors.
- Reload the unpacked extension after pulling these files.
- Keep the Consultancy Pro sample modal open so the PDF can attach.
- Production sites (`qengineering.in`, Railway) also receive Sample Code / PDF.
  After updating this folder, click **Reload** on `chrome://extensions`, then
  refresh the Consultancy Pro tab.
