import { expect, test } from '@playwright/test';

test('um reenvio mantém o primeiro pedido na fila', async ({ page }) => {
  for (const [nome, telefone] of [
    ['Ana do ensaio', '(11) 90000-0001'],
    ['Outro nome', '+55 11 90000-0001'],
  ]) {
    await page.goto('/participante/index.html');
    await page.getByLabel('Como você quer ser chamado?').fill(nome);
    await page.getByLabel('WhatsApp com DDD').fill(telefone);
    await page.getByRole('button', { name: 'Enviar pedido' }).click();
    await expect(page.getByRole('heading', { name: /Recebemos seu pedido/ })).toBeVisible();
  }

  await page.goto('/');
  await page.getByRole('button', { name: 'Fila da Joana' }).click();
  const fila = page.frameLocator('iframe[title="Painel da Joana"]');
  const pedidos = fila.getByRole('list', { name: 'Pedidos em ordem de chegada' }).getByRole('listitem');
  await expect(pedidos).toHaveCount(1);
  await expect(pedidos.first()).toContainText('Ana do ensaio');
  await expect(pedidos.first()).toContainText('Para analisar');
});
