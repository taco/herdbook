import { expect, Page } from '@playwright/test';

// Example usage:
// await selectRadixOption(page, "Work type", "Flatwork");
export async function selectRadixOption(
    page: Page,
    labelText: string,
    optionText: string
) {
    const trigger = page.getByRole('combobox', { name: labelText });
    await trigger.click();

    const option = page.getByRole('option', { name: optionText });
    await option.click();
}
