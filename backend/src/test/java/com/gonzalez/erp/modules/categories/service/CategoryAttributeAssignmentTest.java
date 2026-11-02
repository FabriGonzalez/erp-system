package com.gonzalez.erp.modules.categories.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.repository.ProductAttributeRepository;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** Asignar o quitar de a un atributo desde la pantalla del atributo. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CategoryAttributeAssignmentTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long CATEGORY_ID = 30L;
    private static final Long SIZE_ID = 50L;
    private static final Long COLOR_ID = 60L;

    @Mock private CategoryRepository categoryRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private ProductAttributeRepository attributeRepository;

    @InjectMocks private CategoryServiceImpl categoryService;

    private Category category;
    private ProductAttribute size;
    private ProductAttribute color;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);

        size = attribute(SIZE_ID, "Talle", company);
        color = attribute(COLOR_ID, "Color", company);

        category = Category.builder().name("Remeras").company(company).build();
        category.setId(CATEGORY_ID);
        category.replaceAttributes(List.of(size));

        when(categoryRepository.findByIdAndCompanyId(CATEGORY_ID, COMPANY_ID)).thenReturn(Optional.of(category));
        when(attributeRepository.findByIdInAndCompanyId(Set.of(COLOR_ID), COMPANY_ID)).thenReturn(List.of(color));
        when(attributeRepository.findByIdInAndCompanyId(Set.of(SIZE_ID), COMPANY_ID)).thenReturn(List.of(size));

        Role role = Role.builder()
                .name("Rol")
                .code("ROL")
                .company(company)
                .permissions(EnumSet.of(Permission.ADMINISTRAR_CATEGORIAS))
                .build();
        User user = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .company(company)
                .role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void addingAnAttributeKeepsTheOnesTheCategoryHad() {
        categoryService.addAttributes(CATEGORY_ID, List.of(COLOR_ID));

        assertThat(category.getAttributes()).containsExactlyInAnyOrder(size, color);
    }

    @Test
    void addingAnAttributeTheCategoryAlreadyHasChangesNothing() {
        categoryService.addAttributes(CATEGORY_ID, List.of(SIZE_ID));

        assertThat(category.getAttributes()).containsExactly(size);
    }

    @Test
    void anAttributeOfAnotherCompanyIsNotFound() {
        when(attributeRepository.findByIdInAndCompanyId(Set.of(99L), COMPANY_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> categoryService.addAttributes(CATEGORY_ID, List.of(99L)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(category.getAttributes()).containsExactly(size);
    }

    @Test
    void removingAnAttributeLeavesTheOthers() {
        category.addAttributes(List.of(color));

        categoryService.removeAttribute(CATEGORY_ID, SIZE_ID);

        assertThat(category.getAttributes()).containsExactly(color);
    }

    @Test
    void removingAnAttributeTheCategoryDoesNotHaveChangesNothing() {
        categoryService.removeAttribute(CATEGORY_ID, COLOR_ID);

        assertThat(category.getAttributes()).containsExactly(size);
    }

    @Test
    void aCategoryOfAnotherCompanyIsNotFound() {
        assertThatThrownBy(() -> categoryService.removeAttribute(99L, SIZE_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static ProductAttribute attribute(Long id, String name, Company company) {
        ProductAttribute attribute = ProductAttribute.builder().name(name).company(company).build();
        attribute.setId(id);
        return attribute;
    }
}
