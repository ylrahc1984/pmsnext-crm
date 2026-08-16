export function formatDateForApi(value: string | Date): string {
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${value.getFullYear()}`;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!isoDate) {
    throw new Error('La fecha debe usar el formato yyyy-MM-dd.');
  }

  return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
}

export function todayForDateInput(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export function monthStartForDateInput(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${today.getFullYear()}-${month}-01`;
}

