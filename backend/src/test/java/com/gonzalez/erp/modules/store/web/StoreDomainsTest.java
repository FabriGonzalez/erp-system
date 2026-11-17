package com.gonzalez.erp.modules.store.web;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StoreDomainsTest {

    @Test
    void acceptsADomainOrAnOriginAndKeepsOnlyTheHost() {
        assertThat(StoreDomains.normalize("tienda.com")).contains("tienda.com");
        assertThat(StoreDomains.normalize("  Tienda.COM ")).contains("tienda.com");
        assertThat(StoreDomains.normalize("https://tienda.com")).contains("tienda.com");
        assertThat(StoreDomains.normalize("https://Tienda.com:8443/productos?x=1")).contains("tienda.com");
        assertThat(StoreDomains.normalize("tienda.com.")).contains("tienda.com");
        assertThat(StoreDomains.normalize("http://localhost:3000")).contains("localhost");
    }

    @Test
    void wwwIsADifferentDomain() {
        assertThat(StoreDomains.normalize("https://www.tienda.com")).contains("www.tienda.com");
    }

    @Test
    void rejectsWhatIsNotADomain() {
        assertThat(StoreDomains.normalize(null)).isEmpty();
        assertThat(StoreDomains.normalize("  ")).isEmpty();
        assertThat(StoreDomains.normalize("tienda con espacios.com")).isEmpty();
        assertThat(StoreDomains.normalize("-tienda.com")).isEmpty();
        assertThat(StoreDomains.normalize("tienda_mal.com")).isEmpty();
    }
}
