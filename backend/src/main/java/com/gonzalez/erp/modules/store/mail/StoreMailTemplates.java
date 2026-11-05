package com.gonzalez.erp.modules.store.mail;

import org.springframework.web.util.HtmlUtils;

/**
 * Textos de los mails, en texto plano y HTML (los clientes que no muestran HTML usan el plano).
 * Todo lo que viene del usuario o de la empresa se escapa en el HTML: un nombre con "<a href=...>"
 * no puede meter un link en el mail.
 */
final class StoreMailTemplates {

    record Mail(String subject, String text, String html) {}

    private StoreMailTemplates() {}

    static Mail verification(StoreMailEvent.Verification mail, String link) {
        String subject = "Confirmá tu email en " + mail.storeName();
        String text = """
                Hola %s,

                Para terminar de crear tu cuenta en %s, confirmá tu email con este link:

                %s

                El link vence en 48 horas. Si no te registraste vos, ignorá este mail: sin confirmar, \
                la cuenta no se crea.
                """.formatted(mail.firstName(), mail.storeName(), link);
        String html = layout(mail.storeName(), """
                <p>Hola %s,</p>
                <p>Para terminar de crear tu cuenta en %s, confirmá tu email:</p>
                <p><a href="%s" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;\
                text-decoration:none;border-radius:6px">Confirmar email</a></p>
                <p style="color:#666;font-size:13px">El link vence en 48 horas. Si no te registraste vos, \
                ignorá este mail: sin confirmar, la cuenta no se crea.</p>
                """.formatted(escape(mail.firstName()), escape(mail.storeName()), link));
        return new Mail(subject, text, html);
    }

    static Mail alreadyRegistered(StoreMailEvent.AlreadyRegistered mail, String storeUrl) {
        String subject = "Ya tenés una cuenta en " + mail.storeName();
        String text = """
                Hola %s,

                Alguien (seguramente vos) intentó crear una cuenta en %s con este email, pero ya \
                tenés una. Podés iniciar sesión en %s y, si no recordás la contraseña, recuperarla \
                desde "Olvidé mi contraseña".

                Si no fuiste vos, ignorá este mail: tu cuenta no cambió.
                """.formatted(mail.firstName(), mail.storeName(), storeUrl);
        String html = layout(mail.storeName(), """
                <p>Hola %s,</p>
                <p>Alguien (seguramente vos) intentó crear una cuenta en %s con este email, pero ya tenés una.
                Podés <a href="%s">iniciar sesión</a> y, si no recordás la contraseña, recuperarla desde
                "Olvidé mi contraseña".</p>
                <p style="color:#666;font-size:13px">Si no fuiste vos, ignorá este mail: tu cuenta no cambió.</p>
                """.formatted(escape(mail.firstName()), escape(mail.storeName()), storeUrl));
        return new Mail(subject, text, html);
    }

    private static String layout(String storeName, String body) {
        return """
                <!doctype html>
                <html><body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#111">
                <div style="max-width:520px;margin:0 auto">
                <h2 style="margin:0 0 16px">%s</h2>
                %s
                </div>
                </body></html>
                """.formatted(escape(storeName), body);
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }
}
