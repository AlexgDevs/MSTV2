/**
 * Утилиты для валидации бронирования на клиенте
 * Защита от манипуляций и некорректных данных
 */

// Валидные временные слоты
export const VALID_TIME_SLOTS = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00', '23:00'
] as const;

export type ValidTimeSlot = typeof VALID_TIME_SLOTS[number];

/**
 * Проверяет, является ли время валидным слотом
 */
export function isValidTimeSlot(slotTime: string): slotTime is ValidTimeSlot {
    return VALID_TIME_SLOTS.includes(slotTime as ValidTimeSlot);
}

/**
 * Проверяет, истекла ли дата
 * @param dateString - Дата в формате dd-mm-YYYY или YYYY-mm-dd
 */
export function isDateExpired(dateString: string): boolean {
    if (!dateString) return true;

    let date: Date | null = null;

    // Пробуем формат dd-mm-YYYY
    const ddmmMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmMatch) {
        const [, day, month, year] = ddmmMatch;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
        // Пробуем стандартный формат YYYY-mm-dd
        date = new Date(dateString);
    }

    if (!date || isNaN(date.getTime())) {
        return true; // Некорректная дата считается истекшей
    }

    // Сравниваем только дату (без времени)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date < today;
}

/**
 * Проверяет, можно ли забронировать слот
 * @param status - Статус слота
 * @param dateString - Дата услуги
 */
export function canBookSlot(status: string, dateString?: string): { canBook: boolean; reason?: string } {
    // Проверяем статус
    if (status === 'break') {
        return { canBook: false, reason: 'Этот слот недоступен (дата истекла)' };
    }

    if (status === 'booked') {
        return { canBook: false, reason: 'Этот слот уже забронирован' };
    }

    if (status === 'unavailable') {
        return { canBook: false, reason: 'Этот слот недоступен' };
    }

    if (status !== 'available') {
        return { canBook: false, reason: 'Неизвестный статус слота' };
    }

    // Проверяем дату, если она предоставлена
    if (dateString && isDateExpired(dateString)) {
        return { canBook: false, reason: 'Дата услуги уже истекла' };
    }

    return { canBook: true };
}

/**
 * Валидирует данные для бронирования перед отправкой на сервер
 */
export function validateBookingData(data: {
    service_id: number;
    service_date_id: number;
    slot_time: string;
    price?: number;
}): { valid: boolean; error?: string } {
    // Проверка service_id
    if (!data.service_id || !Number.isInteger(data.service_id) || data.service_id <= 0) {
        return { valid: false, error: 'Некорректный ID услуги' };
    }

    // Проверка service_date_id
    if (!data.service_date_id || !Number.isInteger(data.service_date_id) || data.service_date_id <= 0) {
        return { valid: false, error: 'Некорректный ID даты услуги' };
    }

    // Проверка slot_time
    if (!data.slot_time || typeof data.slot_time !== 'string') {
        return { valid: false, error: 'Время слота не указано' };
    }

    if (!isValidTimeSlot(data.slot_time)) {
        return { valid: false, error: 'Некорректное время слота' };
    }

    // Проверка price (если указан)
    if (data.price !== undefined) {
        if (!Number.isFinite(data.price) || data.price <= 0) {
            return { valid: false, error: 'Некорректная цена' };
        }
    }

    return { valid: true };
}

