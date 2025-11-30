/**
 * Получает дни от сегодня до конца следующей недели
 * @returns Массив объектов с датами в формате dd-mm-YYYY и названиями дней
 */
export const getCurrentWeekDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Находим конец следующей недели (воскресенье следующей недели)
    const dayOfWeek = today.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
    
    // Вычисляем сколько дней до следующего воскресенья (конец следующей недели)
    // Если сегодня воскресенье (0), то до следующего воскресенья 7 дней
    // Если сегодня понедельник (1), то до следующего воскресенья 13 дней
    const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 14 - dayOfWeek;
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilNextSunday);
    endDate.setHours(0, 0, 0, 0);
    
    const days: { date: string; label: string; dayOfWeek: string }[] = [];
    const dayLabels = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Генерируем дни от сегодня до конца следующей недели
    const currentDate = new Date(today);
    
    while (currentDate <= endDate) {
        const day = String(currentDate.getDate()).padStart(2, '0');
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        const dayIndex = currentDate.getDay();
        
        // Проверяем, является ли это сегодня
        const isToday = currentDate.getTime() === today.getTime();
        const dateLabel = isToday ? 'Сегодня' : dayLabels[dayIndex];
        
        days.push({
            date: `${day}-${month}-${year}`,
            label: `${dateLabel}, ${day}.${month}.${year}`,
            dayOfWeek: dayNames[dayIndex]
        });
        
        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
};

