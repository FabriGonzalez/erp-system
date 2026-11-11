package com.gonzalez.erp.modules.store.mail;

import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

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
        // Una cuenta de Google no tiene contraseña que recuperar: mandarla a "Olvidé" sería un callejón sin salida.
        String textAccess = mail.hasPassword()
                ? "Podés iniciar sesión en %s y, si no recordás la contraseña, recuperarla desde \"Olvidé mi contraseña\"."
                        .formatted(storeUrl)
                : "Tu cuenta se creó con Google: entrá a %s con el botón \"Continuar con Google\".".formatted(storeUrl);
        String htmlAccess = mail.hasPassword()
                ? "Podés <a href=\"%s\">iniciar sesión</a> y, si no recordás la contraseña, recuperarla desde \"Olvidé mi contraseña\"."
                        .formatted(storeUrl)
                : "Tu cuenta se creó con Google: <a href=\"%s\">entrá a la tienda</a> con el botón \"Continuar con Google\"."
                        .formatted(storeUrl);
        String text = """
                %s

                Alguien (seguramente vos) intentó crear una cuenta en %s con este email, pero ya \
                tenés una. %s

                Si no fuiste vos, ignorá este mail: tu cuenta no cambió.
                """.formatted(greeting(mail.firstName()), mail.storeName(), textAccess);
        String html = layout(mail.storeName(), """
                <p>%s</p>
                <p>Alguien (seguramente vos) intentó crear una cuenta en %s con este email, pero ya tenés una.
                %s</p>
                <p style="color:#666;font-size:13px">Si no fuiste vos, ignorá este mail: tu cuenta no cambió.</p>
                """.formatted(escape(greeting(mail.firstName())), escape(mail.storeName()), htmlAccess));
        return new Mail(subject, text, html);
    }

    // Una cuenta creada con Google puede no tener nombre.
    private static String greeting(String firstName) {
        return firstName == null || firstName.isBlank() ? "Hola," : "Hola " + firstName + ",";
    }

    static Mail passwordReset(StoreMailEvent.PasswordReset mail, String link) {
        String subject = "Restablecé tu contraseña de " + mail.storeName();
        String text = """
                Hola %s,

                Pediste restablecer la contraseña de tu cuenta en %s. Elegí una nueva con este link:

                %s

                El link vence en 1 hora y sirve una sola vez. Si no lo pediste vos, ignorá este mail: \
                tu contraseña no cambia.
                """.formatted(mail.firstName(), mail.storeName(), link);
        String html = layout(mail.storeName(), """
                <p>Hola %s,</p>
                <p>Pediste restablecer la contraseña de tu cuenta en %s:</p>
                <p><a href="%s" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;\
                text-decoration:none;border-radius:6px">Elegir contraseña nueva</a></p>
                <p style="color:#666;font-size:13px">El link vence en 1 hora y sirve una sola vez. Si no lo \
                pediste vos, ignorá este mail: tu contraseña no cambia.</p>
                """.formatted(escape(mail.firstName()), escape(mail.storeName()), link));
        return new Mail(subject, text, html);
    }

    static Mail passwordChanged(StoreMailEvent.PasswordChanged mail, String storeUrl) {
        String subject = "Cambió tu contraseña de " + mail.storeName();
        String text = """
                Hola %s,

                La contraseña de tu cuenta en %s se cambió recién y se cerraron las sesiones abiertas.

                Si no fuiste vos, entrá a %s y restablecela ya desde "Olvidé mi contraseña".
                """.formatted(mail.firstName(), mail.storeName(), storeUrl);
        String html = layout(mail.storeName(), """
                <p>Hola %s,</p>
                <p>La contraseña de tu cuenta en %s se cambió recién y se cerraron las sesiones abiertas.</p>
                <p>Si no fuiste vos, entrá a <a href="%s">la tienda</a> y restablecela ya desde
                "Olvidé mi contraseña".</p>
                """.formatted(escape(mail.firstName()), escape(mail.storeName()), storeUrl));
        return new Mail(subject, text, html);
    }

    static Mail orderConfirmed(StoreMailEvent.OrderConfirmed mail, String orderUrl) {
        String subject = "Recibimos tu pago: pedido " + mail.orderNumber() + " de " + mail.storeName();
        StoreMailEvent.Delivery delivery = mail.delivery();

        StringBuilder textLines = new StringBuilder();
        StringBuilder htmlLines = new StringBuilder();
        for (StoreMailEvent.Line line : mail.lines()) {
            textLines.append("- ").append(line.quantity()).append(" x ").append(line.name()).append('\n');
            htmlLines.append("<li>").append(line.quantity()).append(" &times; ").append(escape(line.name()));
            if (!line.components().isEmpty()) {
                htmlLines.append("<ul style=\"color:#666\">");
                for (StoreMailEvent.Line component : line.components()) {
                    textLines.append("    ").append(component.quantity()).append(" x ").append(component.name()).append('\n');
                    htmlLines.append("<li>").append(component.quantity()).append(" &times; ")
                            .append(escape(component.name())).append("</li>");
                }
                htmlLines.append("</ul>");
            }
            htmlLines.append("</li>");
        }

        String deliveryText = delivery.pickup()
                ? "Retiralo en la sucursal %s. Llevá el número de pedido.".formatted(delivery.place())
                : "Lo enviamos a %s. Te vamos a contactar para coordinar la entrega.".formatted(delivery.place());
        String deliveryHtml = delivery.pickup()
                ? "Retiralo en la sucursal <strong>%s</strong>. Llevá el número de pedido.".formatted(escape(delivery.place()))
                : "Lo enviamos a <strong>%s</strong>. Te vamos a contactar para coordinar la entrega."
                        .formatted(escape(delivery.place()));
        String delay = delivery.multipleBranches()
                ? " Puede demorar unos días más porque sale de distintas sucursales."
                : "";

        String text = """
                %s

                Recibimos el pago de tu pedido %s en %s.

                %s
                Total pagado: %s

                %s%s

                Podés seguir el pedido en %s
                """.formatted(greeting(mail.firstName()), mail.orderNumber(), mail.storeName(), textLines,
                money(mail.total()), deliveryText, delay, orderUrl);
        String html = layout(mail.storeName(), """
                <p>%s</p>
                <p>Recibimos el pago de tu pedido <strong>%s</strong>.</p>
                <ul style="padding-left:20px">%s</ul>
                <p><strong>Total pagado: %s</strong></p>
                <p>%s%s</p>
                <p><a href="%s" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;\
                text-decoration:none;border-radius:6px">Ver mi pedido</a></p>
                """.formatted(escape(greeting(mail.firstName())), escape(mail.orderNumber()), htmlLines,
                money(mail.total()), deliveryHtml, delay, orderUrl));
        return new Mail(subject, text, html);
    }

    static Mail orderExpired(StoreMailEvent.OrderExpired mail, String storeUrl) {
        String subject = "Se canceló tu pedido " + mail.orderNumber() + " de " + mail.storeName();
        String text = """
                %s

                No recibimos el pago de tu pedido %s en %s a tiempo, así que lo cancelamos y liberamos \
                los productos que tenía reservados. No se te cobró nada.

                Si todavía lo querés, podés volver a comprarlo en %s
                """.formatted(greeting(mail.firstName()), mail.orderNumber(), mail.storeName(), storeUrl);
        String html = layout(mail.storeName(), """
                <p>%s</p>
                <p>No recibimos el pago de tu pedido <strong>%s</strong> a tiempo, así que lo cancelamos y
                liberamos los productos que tenía reservados. No se te cobró nada.</p>
                <p>Si todavía lo querés, podés <a href="%s">volver a comprarlo</a>.</p>
                """.formatted(escape(greeting(mail.firstName())), escape(mail.orderNumber()), storeUrl));
        return new Mail(subject, text, html);
    }

    // Formato argentino: punto de miles y coma decimal; sin centavos si son cero.
    private static String money(BigDecimal amount) {
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance(Locale.forLanguageTag("es-AR"));
        String pattern = amount.stripTrailingZeros().scale() <= 0 ? "#,##0" : "#,##0.00";
        return "$ " + new DecimalFormat(pattern, symbols).format(amount);
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
