# QE Consultancy — Chrome / Edge / Brave

Merged extension: **Manak Test Request** + **IS Code portal fetch** + **copy/paste bypass** + **bulk fill**.

Load this folder as an unpacked extension.

## Install

1. Open `chrome://extensions` (Chrome), `edge://extensions` (Edge), or `brave://extensions` (Brave).
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `extensions/qe-consultancy-chrome`.
5. Pin the extension. After every pull, click **Reload**.

## Features

- Open / fill BIS Manak Test Request from Consultancy Pro.
- From IS Code Master, the search icon fetches LIMS testing charges (highest), Manak marking fees / slabs, Product Manual files, and BSB Edge standard PDFs.
- On Know Fees, BSB Edge, and Manak login the extension reads the weak image captcha locally and continues.
- Copy/paste and Ctrl/Cmd shortcuts on sites that try to block them.
- Bulk fill matching fields by name, id, placeholder, or label.

Save BSB Edge email / password in the popup (this browser only). The extension never stores those values in the app repo, never fills OTP, and never clicks Pay.

## Daily use

1. In Consultancy Pro, fill the sample and click **Open Manak**.
2. On Manak, the extension fills login and solves the image captcha.
3. Use the popup toggles for copy/paste on any website.
4. Use **Bulk Fill** to write one value into every matching field.
