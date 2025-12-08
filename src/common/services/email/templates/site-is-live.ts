import { EmailTemplate } from '../email.service';

export const SiteIsLiveEmailTemplate: EmailTemplate = {
  subject: 'Welcome to {{appName}}!',
  html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Welcome to Webild</title>
    <style>
      :root {
        color-scheme: light dark;
        supported-color-schemes: light dark;
      }

      @media (prefers-color-scheme: dark) {
        .bg {
          background: #0f1320 !important;
        }
        .card {
          background: #151a2b !important;
          box-shadow: none !important;
        }
        .heading {
          color: #fff !important;
        }
        .muted {
          color: #a9aec3 !important;
        }
        .btn {
          color: #fff !important;
        }
      }
      @media screen and (max-width: 640px) {
        .container {
          width: 100% !important;
        }
        .px {
          padding-left: 20px !important;
          padding-right: 20px !important;
        }
        .hero-title {
          font-size: 48px !important;
          line-height: 1.05 !important;
        }
        .h1 {
          font-size: 32px !important;
          line-height: 1.15 !important;
        }
      }
    </style>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto,
        Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 24px;
      color: #111;
    "
  >
    <!-- BACKGROUND -->
    <center
      role="article"
      aria-roledescription="email"
      lang="en"
      class="bg"
      style="width: 100%; background: #f6f7fc"
    >
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 24px 12px">
            <!-- CONTAINER -->
            <table
              role="presentation"
              cellspacing="0"
              cellpadding="0"
              border="0"
              class="container"
              style="width: 550px; max-width: 550px"
            >
              <tr>
                <td style="height: 24px; line-height: 24px; font-size: 0">&nbsp;</td>
              </tr>

              <!-- ============ MAIN ============ -->
              <tr>
                <td align="center" class="px" style="padding: 0 24px">
                  <table
                    role="presentation"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    width="100%"
                    class="card"
                    style="
                      border-radius: 24px;
                      overflow: hidden;
                      background: #ffffff;
                      box-shadow: 0 0 24px rgba(0, 0, 0, 0.1);
                    "
                  >
                    <tr>
                      <td align="center" style="padding: 25px 0 0 0">
                        <span
                          style="
                            display: block;
                            width: fit-content;
                            margin: 0 auto;
                            border-radius: 24.8791px;
                            background: linear-gradient(183deg, #ffffff 34.94%, #acb3d6b0 117.02%);
                            padding: 3.34px;
                          "
                        >
                          <span
                            role="button"
                            style="
                              display: block;
                              width: fit-content;
                              padding: 0 25px;

                              text-decoration: none;
                              text-align: center;
                              border-radius: 21.5px;
                              background: linear-gradient(
                                180deg,
                                rgba(237, 240, 253, 0.75) -36.93%,
                                rgba(238, 239, 242, 0.75) 63.79%
                              );
                              box-shadow: -5.39px 5.39px 11.13px rgba(151, 156, 181, 0.62);
                              font-size: 18px;
                              font-weight: 400;
                              color: #000;
                              text-shadow: 0 0 31.1191px rgba(0, 0, 0, 0.13);
                            "
                          >
                           First Publish Celebration
                          </span>
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding: 32px 0px 10px 0px">
                        <h1
                          class="h2 heading"
                          style="
                            margin: 0 0 8px 0;
                            font-weight: 800;
                            font-size: 35px;
                            line-height: 1.2;
                            color: #14151a;
                          "
                        >
                          Your First Site Is Live!
                        </h1>
                        <p
                          class="muted"
                          style="margin: 0; font-size: 17px; line-height: 28px; color: #747988"
                        >
                          This Is The Beginning Of Your Digital Journey.
                        </p>
                        <p
                          class="muted"
                          style="margin: 0; font-size: 17px; line-height: 28px; color: #747988"
                        >
                          Don't Forget To Listen To Bob When Ge Suggests Upgrades :)
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding: 20px 0 0 0">
                        <span
                          style="
                            display: inline-block;
                            border-radius: 63.7534px;
                            padding: 2.4px;
                            background: linear-gradient(
                              180deg,
                              #c5cfff 0%,
                              rgba(93, 107, 179, 0.44) 17.79%,
                              rgba(93, 107, 179, 0.66) 46.15%,
                              #d3daff 100%
                            );
                          "
                        >
                          <a
                            href="{{ctaUrl}}"
                            class="btn"
                            style="
                              mso-hide: all;
                              display: inline-block;
                              text-decoration: none;
                              text-align: center;
                              width: fit-content;
                              padding: 0 25px;
                              height: 32.37px;
                              line-height: 37.37px;
                              border-radius: 61.35px;
                              background: linear-gradient(180deg, #c7d0fb 0%, #7080ce 100%);
                              color: #f1f3f8;
                              font:
                                700 16px/32.37px -apple-system,
                                'Segoe UI',
                                Roboto,
                                Helvetica,
                                Arial,
                                sans-serif;
                            "
                          >
                           Share my Link
                          </a>
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding: 0">
                        <img
                          src="https://i.ibb.co/r2c70T3K/V2.png"
                          width="520"
                          alt="Build me a cool website preview"
                          style="
                            padding: 25px 0;
                            display: block;
                            margin-right: auto;
                            max-width: 80%;
                            height: auto;
                            border: 0;
                            outline: none;
                            text-decoration: none;
                          "
                        />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="height: 24px; line-height: 24px; font-size: 0">&nbsp;</td>
              </tr>

              <!-- ============ FOOTER ============ -->
              <tr>
                <td align="center" class="px" style="padding: 0 24px">
                  <table
                    role="presentation"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    width="100%"
                  >
                    <tr>
                      <td align="center" style="padding: 0">
                        <span
                          style="
                            display: block;
                            max-width: 650px;
                            margin: 0 auto;
                            border-radius: 24.8791px;
                            background: linear-gradient(183deg, #ffffff 34.94%, #acb3d6b0 117.02%);
                            padding: 3.34px;
                          "
                        >
                          <a
                            href="{{websiteUrl}}"
                            role="button"
                            style="
                              display: block;
                              width: 100%;
                              min-height: 60px;
                              line-height: 60px;
                              text-decoration: none;
                              text-align: center;
                              border-radius: 21.5px;
                              background: linear-gradient(
                                180deg,
                                rgba(237, 240, 253, 0.75) -36.93%,
                                rgba(238, 239, 242, 0.75) 63.79%
                              );
                              box-shadow: -5.39px 5.39px 11.13px rgba(151, 156, 181, 0.62);
                              font-size: 32px;
                              font-weight: 400;
                              color: #000;
                              text-shadow: 0 0 31.1191px rgba(0, 0, 0, 0.13);
                            "
                          >
                            Website
                          </a>
                        </span>
                      </td>
                    </tr>
                  </table>

                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                  >
                    <tr>
                      <td style="height: 24px; line-height: 24px; font-size: 0">&nbsp;</td>
                    </tr>
                  </table>

                  <table
                    role="presentation"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    width="100%"
                  >
                    <tr>
                      <td align="center" style="padding: 0">
                        <span
                          style="
                            display: block;
                            max-width: 650px;
                            margin: 0 auto;
                            border-radius: 24.8791px;
                            background: linear-gradient(183deg, #ffffff 34.94%, #acb3d6b0 117.02%);
                            padding: 3.34px;
                          "
                        >
                          <a
                            href="{{websiteUrl}}"
                            role="button"
                            style="
                              display: block;
                              width: 100%;
                              min-height: 60px;
                              line-height: 60px;
                              text-decoration: none;
                              text-align: center;
                              border-radius: 21.5px;
                              background: linear-gradient(
                                180deg,
                                rgba(237, 240, 253, 0.75) -36.93%,
                                rgba(238, 239, 242, 0.75) 63.79%
                              );
                              box-shadow: -5.39px 5.39px 11.13px rgba(151, 156, 181, 0.62);
                              font-size: 32px;
                              font-weight: 400;
                              color: #000;
                              text-shadow: 0 0 31.1191px rgba(0, 0, 0, 0.13);
                            "
                          >
                            Contact
                          </a>
                        </span>
                      </td>
                    </tr>
                  </table>

                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                  >
                    <tr>
                      <td style="height: 24px; line-height: 24px; font-size: 0">&nbsp;</td>
                    </tr>
                  </table>

                  <!-- Logo -->
                  <table
                    role="presentation"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    width="100%"
                  >
                    <tr>
                      <td align="center" style="padding: 0">
                        <img
                          src="https://i.ibb.co/wXrCxPh/Webild-Logo-1.png"
                          width="150"
                          height="55"
                          alt="Webild"
                          style="
                            display: block;
                            margin: 0 auto;
                            height: auto;
                            border: 0;
                            outline: none;
                            text-decoration: none;
                          "
                        />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="height: 16px; line-height: 16px; font-size: 0">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>


  `,
};
