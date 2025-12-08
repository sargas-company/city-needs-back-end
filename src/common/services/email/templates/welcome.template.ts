// import { EmailTemplate } from '../email.service';
//
// export const weelcomeEmailTemplate: EmailTemplate = {
//   subject: 'Welcome to {{appName}}!',
//   html: `
//
// <!doctype html>
//
// <!doctype html>
// <html lang="en">
//   <head>
//     <meta charset="utf-8" />
//     <meta name="viewport" content="width=device-width,initial-scale=1" />
//     <title>Welcome to Webild</title>
//     <style>
//       :root {
//         color-scheme: light dark;
//         supported-color-schemes: light dark;
//       }
//       @media (prefers-color-scheme: dark) {
//         .bg {
//           background: #0f1320 !important;
//         }
//         .card {
//           background: #151a2b !important;
//           box-shadow: none !important;
//         }
//         .heading {
//           color: #fff !important;
//         }
//         .muted {
//           color: #a9aec3 !important;
//         }
//         .btn {
//           color: #fff !important;
//         }
//       }
//       @media screen and (max-width: 640px) {
//         .container {
//           width: 100% !important;
//           padding-left: 20px !important;
//           padding-right: 20px !important;
//         }
//         .hero-title {
//           font-size: 48px !important;
//           line-height: 1.05 !important;
//         }
//         .h1 {
//           font-size: 32px !important;
//           line-height: 1.15 !important;
//         }
//       }
//     </style>
//   </head>
//   <body
//     style="
//       margin: 0;
//       padding: 0;
//       font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto,
//         Helvetica, Arial, sans-serif;
//       font-size: 16px;
//       line-height: 24px;
//       color: #111;
//     "
//   >
//     <!-- background -->
//     <div class="bg" style="background: #f6f7fc; padding: 24px 12px">
//       <!-- container -->
//       <div
//         class="container"
//         style="
//           max-width: 600px;
//           margin: 0 auto;
//           display: flex;
//           flex-direction: column;
//           gap: 24px;
//           width: 100%;
//         "
//       >
//         <header
//           style="position: relative; border-radius: 24px; overflow: hidden; min-height: 200px"
//         >
//           <div
//             style="
//               position: absolute;
//               inset: 0;
//               background-image: url('https://i.ibb.co/dJjR1cFj/44aefa574c1610b21b38557caa274c791f10d16f.png');
//               background-repeat: no-repeat;
//               background-size: cover;
//               /* СМЕЩЕНИЕ ФОНА: X Y (положительные = вправо/вниз; отрицательные = влево/вверх) */
//               background-position: 0px -35px;
//               transform: rotate(180deg);
//               filter: blur(1px);
//             "
//           ></div>
//
//           <div style="position: relative; padding: 58px 24px; text-align: center">
//             <div
//               class="hero-title"
//               style="
//                 font-weight: 800;
//                 font-size: 64px;
//                 line-height: 1;
//                 color: #fff;
//                 text-shadow: 0 0 16px rgba(0, 0, 0, 0.18);
//               "
//             >
//               Welcome
//             </div>
//           </div>
//         </header>
//
//         <!-- CONTENT -->
//         <main
//           class="card"
//           style="
//             background: #fff;
//             border-radius: 24px;
//             box-shadow: 0 0 24px rgba(0, 0, 0, 0.1);
//             padding: 35px 0;
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             text-align: center;
//           "
//         >
//           <h1
//             class="h1 heading"
//             style="
//               margin: 0 0 8px 0;
//               font-weight: 800;
//               font-size: 40px;
//               line-height: 1.2;
//               color: #14151a;
//             "
//           >
//             Welcome to
//             <span style="display: inline-block; vertical-align: middle; line-height: 1">Webild</span
//             >.
//           </h1>
//
//           <p
//             class="muted"
//             style="margin: 4px 0 0 0; font-size: 17px; line-height: 28px; color: #747988"
//           >
//             Thanks for signing up. Your website journey starts now.
//           </p>
//
//           <img
//             src="https://i.ibb.co/FqkCz9Q0/Group-314323.png"
//             alt="Group-314323"
//             border="0"
//             style="width: 90%; align-self: flex-end"
//           />
//
//           <p class="muted" style="margin: 0; font-size: 16px; line-height: 26px; color: #8b8fa1">
//             You can launch your first site in minutes (no code, no stress).
//           </p>
//
//           <a
//             href="{{ctaUrl}}"
//             class="btn"
//             style="
//               display: inline-block;
//               text-decoration: none;
//               text-align: center;
//               margin-top: 24px;
//               width: 282.68px;
//               height: 47.37px;
//               line-height: 47.37px;
//               border-radius: 63.7534px;
//               border: 2.4px solid transparent;
//               background-image: linear-gradient(180deg, #c7d0fb 0%, #7080ce 100%),
//                 linear-gradient(
//                   180deg,
//                   #c5cfff 0%,
//                   rgba(93, 107, 179, 0.44) 17.79%,
//                   rgba(93, 107, 179, 0.66) 46.15%,
//                   #d3daff 100%
//                 );
//               background-origin: border-box;
//               background-clip: padding-box, border-box;
//               font:
//                 700 20px/47.37px -apple-system,
//                 'Segoe UI',
//                 Roboto,
//                 Helvetica,
//                 Arial,
//                 sans-serif;
//               color: #f1f3f8;
//             "
//           >
//             Build your site
//           </a>
//         </main>
//
//         <!-- FOOTER -->
//         <footer
//           style="
//             display: flex;
//             flex-direction: column;
//             gap: 38px;
//             align-items: center;
//             justify-content: center;
//           "
//         >
//           <!-- кнопки тянутся на 100% ширины контейнера (max 600px) -->
//           <a
//             href="{{websiteUrl}}"
//             role="button"
//             style="
//               display: block;
//               width: 100%;
//               text-decoration: none;
//               text-align: center;
//               min-height: 83.77px;
//               line-height: 83.77px;
//               padding: 0;
//               background: linear-gradient(
//                 180deg,
//                 rgba(237, 240, 253, 0.75) -36.93%,
//                 rgba(238, 239, 242, 0.75) 63.79%
//               );
//               box-shadow: -5.38752px 5.38752px 11.1342px rgba(151, 156, 181, 0.62);
//               border-radius: 24.8791px;
//               font-size: 32px;
//               font-weight: 400;
//               color: #000;
//               text-shadow: 0 0 31.1191px rgba(0, 0, 0, 0.13);
//             "
//           >
//             Website
//           </a>
//
//           <a
//             href="{{contactUrl}}"
//             role="button"
//             style="
//               display: block;
//               width: 100%;
//               text-decoration: none;
//               text-align: center;
//               min-height: 83.77px;
//               line-height: 83.77px;
//               padding: 0;
//               background: linear-gradient(
//                 180deg,
//                 rgba(237, 240, 253, 0.75) -36.93%,
//                 rgba(238, 239, 242, 0.75) 63.79%
//               );
//               box-shadow: -5.38752px 5.38752px 11.1342px rgba(151, 156, 181, 0.62);
//               border-radius: 24.8791px;
//               font-size: 32px;
//               font-weight: 400;
//               color: #000;
//               text-shadow: 0 0 31.1191px rgba(0, 0, 0, 0.13);
//             "
//           >
//             Contact
//           </a>
//
//           <img
//             src="https://i.ibb.co/wXrCxPh/Webild-Logo-1.png"
//             alt="Webild-Logo-1"
//             border="0"
//             style="max-width: 223px; max-height: 66px"
//           />
//
//           <!-- второе лого (адаптивное, ограничено контейнером) -->
//           <!--            <img src="{{logoUrl}}" alt="Webild"-->
//           <!--                 style="display:block;height:auto;width:100%;max-width:160px;border:0;outline:none;text-decoration:none;margin:8px auto 0;" />-->
//         </footer>
//       </div>
//     </div>
//   </body>
// </html>
//
//
//   `,
// };

import { EmailTemplate } from '../email.service';

export const weelcomeEmailTemplate: EmailTemplate = {
  subject: 'Welcome to {{appName}}!',
  html: `
<!doctype html>
<!doctype html>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Welcome to Webild</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    /* Dark mode hints */
    @media (prefers-color-scheme: dark) {
      .bg    { background:#0f1320 !important; }
      .card  { background:#151a2b !important; box-shadow:none !important; }
      .heading { color:#fff !important; }
      .muted   { color:#a9aec3 !important; }
      .btn     { color:#fff !important; }
    }
    @media screen and (max-width:640px){
      .container{ width:100% !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
      .hero-title{ font-size:48px !important; line-height:1.05 !important; }
      .h1{ font-size:32px !important; line-height:1.15 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:#111;">
  <!-- BACKGROUND -->
  <center role="article" aria-roledescription="email" lang="en" class="bg" style="width:100%;background:#f6f7fc;">
    <!-- hidden preheader -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Thanks for signing up — your website journey starts now.</div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <!-- CONTAINER -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"  class="container" style="width:550px;max-width:550px;">
            <!-- ============ HEADER ============ -->
            <tr>
              <td align="center" style="padding:0 24px;">
                <!-- Card with background image -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-radius:24px;overflow:hidden;">
                  <tr>
                    <td
                      background="https://i.ibb.co/dJjR1cFj/44aefa574c1610b21b38557caa274c791f10d16f.png" 
                      style="
                        background:#cbd2ff;
                        background-image:url('https://i.ibb.co/dJjR1cFj/44aefa574c1610b21b38557caa274c791f10d16f.png');
                        background-size:cover;background-repeat:no-repeat;background-position:0 -35px;
                        padding:56px 24px 40px 24px;text-align:center;
                      "
                    >
                      <!--[if gte mso 9]>
                      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:200px;">
                        <v:fill type="frame" src="https://YOUR-CDN.example.com/hero-bg.jpg" color="#cbd2ff" />
                        <v:textbox inset="0,0,0,0">
                      <![endif]-->
                      <div class="hero-title" style="font-weight:800;font-size:64px;line-height:1;color:#ffffff;text-shadow:0 0 16px rgba(0,0,0,0.18);">
                        Welcome
                      </div>
                      <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- spacer -->
            <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>

            <!-- ============ MAIN ============ -->
            <tr>
              <td align="center" class="px" style="padding:0 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="card"
                       style="border-radius:24px;overflow:hidden;background:#ffffff;box-shadow:0 0 24px rgba(0,0,0,0.10);">
                  <tr>
                    <td align="center" style="padding:32px 24px 10px 24px;">
                      <h1 class="h1 heading" style="margin:0 0 8px 0;font-weight:800;font-size:40px;line-height:1.2;color:#14151a;">
                        Welcome to <span style="display:inline-block;vertical-align:middle;line-height:1;">Webild</span>.
                      </h1>
                      <p class="muted" style="margin:0;font-size:17px;line-height:28px;color:#747988;">
                        Thanks for signing up. Your website journey starts now.
                      </p>
                    </td>
                  </tr>

                  <!-- hero graphic -->
                  <tr>
                    <td align="center" style="padding:16px 24px 0 24px;">
                      <img src="https://i.ibb.co/FqkCz9Q0/Group-314323.png" width="520" alt="Build me a cool website preview"
                           style="display:block;margin:0 auto;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:16px 24px 0 24px;">
                      <p class="muted" style="margin:0;font-size:16px;line-height:26px;color:#8b8fa1;">
                        You can launch your first site in minutes (no code, no stress).
                      </p>
                    </td>
                  </tr>

                  <!-- primary CTA with gradient border (надёжный способ: обёртка + внутренняя кнопка) -->
                  <tr>
                    <td align="center" style="padding:24px 24px 36px 24px;">
                      <span
                        style="
                          display:inline-block;border-radius:63.7534px;padding:2.4px;
                          background:linear-gradient(180deg,#c5cfff 0%,rgba(93,107,179,0.44) 17.79%,rgba(93,107,179,0.66) 46.15%,#d3daff 100%);
                        "
                      >
                        <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ctaUrl}}"
                                       style="height:47.37px;v-text-anchor:middle;width:282.68px;"
                                       arcsize="60%" fillcolor="#C7D0FB" strokecolor="#C7D0FB">
                            <w:anchorlock/>
                            <center style="color:#FFFFFF;font-family:Segoe UI, Arial, sans-serif;font-size:20px;font-weight:700;">
                              Build your site
                            </center>
                          </v:roundrect>
                        <![endif]-->
                        <a href="{{ctaUrl}}" class="btn"
                           style="
                             mso-hide:all;display:inline-block;text-decoration:none;text-align:center;
                             width:282.68px;height:47.37px;line-height:47.37px;border-radius:61.35px;
                             background:linear-gradient(180deg,#c7d0fb 0%,#7080ce 100%);
                             color:#f1f3f8;font:700 20px/47.37px -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                           ">
                          Build your site
                        </a>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- spacer -->
            <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>

            <!-- ============ FOOTER ============ -->
            <tr>
              <td align="center" class="px" style="padding:0 24px;">
                <!-- Website button (full width) -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="padding:0;">
                      <span style="
                        display:block;
                        max-width:650px;
                        margin:0 auto;
                        border-radius:24.8791px;
                        background:linear-gradient(183deg, #ffffff 34.94%, #acb3d6b0 117.02%);
                        padding:3.34px; /* толщина рамки */
                      ">
                        <!-- сама кнопка -->
                        <a href="{{websiteUrl}}" role="button" style="
                          display:block;
                          width:100%;
                          min-height:83.77px;
                          line-height:83.77px;
                          text-decoration:none;
                          text-align:center;
                          border-radius:21.5px; /* радиус чуть меньше рамки */
                          background:linear-gradient(180deg,rgba(237,240,253,0.75) -36.93%, rgba(238,239,242,0.75) 63.79%);
                          box-shadow:-5.39px 5.39px 11.13px rgba(151,156,181,0.62);
                          font-size:32px;font-weight:400;color:#000;
                          text-shadow:0 0 31.1191px rgba(0,0,0,0.13);
                        ">
                         Website
                        </a>
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- spacer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr></table>

                <!-- Contact button (full width) -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="padding:0;">
                      <span style="
                        display:block;
                        max-width:650px;
                        margin:0 auto;
                        border-radius:24.8791px;
                        background:linear-gradient(183deg, #ffffff 34.94%, #acb3d6b0 117.02%);
                        padding:3.34px; /* толщина рамки */
                      ">
                        <!-- сама кнопка -->
                        <a href="{{websiteUrl}}" role="button" style="
                          display:block;
                          width:100%;
                          min-height:83.77px;
                          line-height:83.77px;
                          text-decoration:none;
                          text-align:center;
                          border-radius:21.5px; /* радиус чуть меньше рамки */
                          background:linear-gradient(180deg,rgba(237,240,253,0.75) -36.93%, rgba(238,239,242,0.75) 63.79%);
                          box-shadow:-5.39px 5.39px 11.13px rgba(151,156,181,0.62);
                          font-size:32px;font-weight:400;color:#000;
                          text-shadow:0 0 31.1191px rgba(0,0,0,0.13);
                        ">
                         Contact
                        </a>
                      </span>
                    </td>
                  </tr>
                </table>
                
              

                <!-- spacer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr></table>

                <!-- Logo -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="padding:0;">
                      <img src="https://i.ibb.co/wXrCxPh/Webild-Logo-1.png" width="223" height="66" alt="Webild"
                           style="display:block;margin:0 auto;height:auto;border:0;outline:none;text-decoration:none;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- bottom spacer -->
            <tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </center>

</body>
</html>


  `,
};
