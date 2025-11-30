import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useMasterSchedule } from '../../features/master/hooks/useMasterData';
import { servicesApi } from '../../api/services/services.api';
import { templatesApi } from '../../api/templates/templates.api';
import { serviceDatesApi } from '../../api/dates/dates.api';
import { getCurrentWeekDays } from '../../utils/helpers';

type TabId = 'services' | 'schedule' | 'templates' | 'bookings';

const tabs: { id: TabId; label: string }[] = [
    { id: 'services', label: 'Мои услуги' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'templates', label: 'Шаблоны расписания' },
    { id: 'bookings', label: 'Бронирования' },
];

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

const dayLabels: Record<string, string> = {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Саббота',
    sunday: 'Воскресенье'
};

const statusBadge: Record<string, string> = {
    available: 'bg-[#4ec9b0]/20 text-[#4ec9b0] border border-[#4ec9b0]/30',
    booked: 'bg-[#dcdcaa]/20 text-[#dcdcaa] border border-[#dcdcaa]/30',
    break: 'bg-[#f48771]/20 text-[#f48771] border border-[#f48771]/30',
    unavailable: 'bg-[#3e3e42] text-[#6a6a6a] border border-[#464647]'
};

const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const statusColors = {
    available: 'bg-[#4ec9b0] hover:bg-[#4ec9b0]/90 hover:shadow-lg hover:shadow-[#4ec9b0]/30',
    break: 'bg-[#f48771] hover:bg-[#f48771]/90 hover:shadow-lg hover:shadow-[#f48771]/30',
    unavailable: 'bg-[#3e3e42] hover:bg-[#464647] border border-[#464647]'
};

const statusLabels = {
    available: 'Доступно',
    break: 'Перерыв',
    unavailable: 'Недоступно'
};

const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

export const MasterDashboardPage: React.FC = () => {
    const { user, refreshUser } = useAuthStore();
    const services = user?.services ?? [];
    const serviceIds = useMemo(() => services.map(service => service.id), [services]);

    const [activeTab, setActiveTab] = useState<TabId>('services');
    const [scheduleServiceFilter, setScheduleServiceFilter] = useState<number | 'all'>('all');
    const [bookingsServiceFilter, setBookingsServiceFilter] = useState<number | null>(
        services[0]?.id ?? null
    );

    const [isCreatingService, setIsCreatingService] = useState(false);
    const [serviceForm, setServiceForm] = useState({
        title: '',
        description: '',
        price: '',
        photo: ''
    });
    const [serviceFormError, setServiceFormError] = useState<string | null>(null);
    const [isServiceSubmitting, setIsServiceSubmitting] = useState(false);

    // Шаблоны - новые состояния
    const [templateServiceFilter, setTemplateServiceFilter] = useState<number | 'all'>('all');
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [templateForm, setTemplateForm] = useState({
        service_id: services[0]?.id || null,
        day: 'monday',
        hours_work: {} as Record<string, 'available' | 'break' | 'unavailable'>,
        is_active: true
    });
    const [isTemplateSubmitting, setIsTemplateSubmitting] = useState(false);
    const [templateError, setTemplateError] = useState<string | null>(null);

    // Состояния для создания расписания вручную
    const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        service_id: services[0]?.id || null,
        date: '',
        slots: {} as Record<string, 'available' | 'break' | 'unavailable'>
    });
    const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
    const [scheduleFormError, setScheduleFormError] = useState<string | null>(null);
    const weekDays = useMemo(() => getCurrentWeekDays(), []);

    useEffect(() => {
        if (services.length && bookingsServiceFilter === null) {
            setBookingsServiceFilter(services[0].id);
        }
        if (services.length && templateForm.service_id === null) {
            setTemplateForm(prev => ({ ...prev, service_id: services[0].id }));
        }
        if (services.length && scheduleForm.service_id === null) {
            setScheduleForm(prev => ({ ...prev, service_id: services[0].id }));
        }
        if (weekDays.length && !scheduleForm.date) {
            setScheduleForm(prev => ({ ...prev, date: weekDays[0].date }));
        }
    }, [services, bookingsServiceFilter, weekDays]);

    const {
        schedule,
        isLoading: isScheduleLoading,
        error: scheduleError,
        refresh: refreshSchedule
    } = useMasterSchedule(serviceIds);

    const filteredSchedule = useMemo(() => {
        if (scheduleServiceFilter === 'all') {
            return schedule;
        }
        return schedule.filter(date => date.service_id === scheduleServiceFilter);
    }, [schedule, scheduleServiceFilter]);

    const bookedSlots = useMemo(() => {
        if (!bookingsServiceFilter) {
            return [];
        }
        return schedule
            .filter(date => date.service_id === bookingsServiceFilter)
            .flatMap(date =>
                Object.entries(date.slots)
                    .filter(([, status]) => status === 'booked')
                    .map(([slot]) => ({
                        slot,
                        date: date.date,
                        serviceId: date.service_id
                    }))
            );
    }, [schedule, bookingsServiceFilter]);

    // Фильтрация шаблонов по услуге
    const filteredTemplates = useMemo(() => {
        const templates = user?.templates ?? [];
        if (templateServiceFilter === 'all') {
            return templates;
        }
        return templates.filter(template => template.service_id === templateServiceFilter);
    }, [user?.templates, templateServiceFilter]);

    // Группировка шаблонов по услуге для отображения
    const templatesByService = useMemo(() => {
        const templates = filteredTemplates;
        const grouped = templates.reduce<Record<number, typeof templates>>((acc, template) => {
            if (!template.service_id) return acc;
            if (!acc[template.service_id]) {
                acc[template.service_id] = [];
            }
            acc[template.service_id].push(template);
            return acc;
        }, {});

        // Сортируем по названию услуги
        return Object.fromEntries(
            Object.entries(grouped).sort(([aId], [bId]) => {
                const aService = services.find(s => s.id === Number(aId));
                const bService = services.find(s => s.id === Number(bId));
                return (aService?.title || '').localeCompare(bService?.title || '');
            })
        );
    }, [filteredTemplates, services]);

    if (!user) {
        return null;
    }

    const handleServiceFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setServiceForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateService = async (event: React.FormEvent) => {
        event.preventDefault();
        setServiceFormError(null);

        if (!serviceForm.title.trim() || !serviceForm.description.trim()) {
            setServiceFormError('Название и описание обязательны');
            return;
        }

        const price = Number(serviceForm.price);
        if (!Number.isFinite(price) || price <= 0) {
            setServiceFormError('Цена должна быть положительным числом');
            return;
        }

        setIsServiceSubmitting(true);
        try {
            await servicesApi.create({
                title: serviceForm.title.trim(),
                description: serviceForm.description.trim(),
                price,
                photo: serviceForm.photo.trim() || ''
            });
            await refreshUser();
            setServiceForm({
                title: '',
                description: '',
                price: '',
                photo: ''
            });
            setIsCreatingService(false);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Не удалось создать услугу';
            setServiceFormError(message);
        } finally {
            setIsServiceSubmitting(false);
        }
    };

    // Функции для работы с шаблонами
    const handleTimeSlotClick = (time: string) => {
        setTemplateForm(prev => {
            const currentStatus = prev.hours_work[time] || 'unavailable';
            const nextStatus = 
                currentStatus === 'unavailable' ? 'available' :
                currentStatus === 'available' ? 'break' : 'unavailable';
            
            return {
                ...prev,
                hours_work: {
                    ...prev.hours_work,
                    [time]: nextStatus
                }
            };
        });
    };

    const handleCreateTemplate = async () => {
        setTemplateError(null);

        if (!templateForm.service_id) {
            setTemplateError('Выберите услугу');
            return;
        }

        // Фильтруем только выбранные слоты (не unavailable)
        const activeHoursWork = Object.fromEntries(
            Object.entries(templateForm.hours_work).filter(([, status]) => status !== 'unavailable')
        );

        if (Object.keys(activeHoursWork).length === 0) {
            setTemplateError('Выберите хотя бы один временной слот');
            return;
        }

        setIsTemplateSubmitting(true);
        try {
            await templatesApi.create({
                day: templateForm.day,
                hours_work: activeHoursWork,
                is_active: templateForm.is_active,
                service_id: templateForm.service_id
            });
            await refreshUser();
            setIsCreatingTemplate(false);
            setTemplateForm({
                service_id: services[0]?.id || null,
                day: 'monday',
                hours_work: {},
                is_active: true
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Не удалось создать шаблон';
            setTemplateError(message);
        } finally {
            setIsTemplateSubmitting(false);
        }
    };

    const handleEditTemplate = (template: any) => {
        setEditingTemplate(template);
        setTemplateForm({
            service_id: template.service_id,
            day: template.day,
            hours_work: { ...template.hours_work },
            is_active: template.is_active
        });
        setIsCreatingTemplate(true);
    };

    const handleUpdateTemplate = async () => {
        if (!editingTemplate) return;

        setTemplateError(null);
        const activeHoursWork = Object.fromEntries(
            Object.entries(templateForm.hours_work).filter(([, status]) => status !== 'unavailable')
        );

        if (Object.keys(activeHoursWork).length === 0) {
            setTemplateError('Выберите хотя бы один временной слот');
            return;
        }

        setIsTemplateSubmitting(true);
        try {
            await templatesApi.update(editingTemplate.id, {
                day: templateForm.day,
                hours_work: activeHoursWork,
                is_active: templateForm.is_active,
                service_id: templateForm.service_id
            });
            await refreshUser();
            setIsCreatingTemplate(false);
            setEditingTemplate(null);
            setTemplateForm({
                service_id: services[0]?.id || null,
                day: 'monday',
                hours_work: {},
                is_active: true
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Не удалось обновить шаблон';
            setTemplateError(message);
        } finally {
            setIsTemplateSubmitting(false);
        }
    };

    const handleDeleteTemplate = async (templateId: number) => {
        if (!confirm('Удалить этот шаблон?')) return;
        
        try {
            await templatesApi.delete(templateId);
            await refreshUser();
        } catch (error) {
            console.error('Ошибка при удалении шаблона:', error);
        }
    };

    const handleToggleTemplateStatus = async (template: any) => {
        try {
            await templatesApi.update(template.id, {
                ...template,
                is_active: !template.is_active
            });
            await refreshUser();
        } catch (error) {
            console.error('Ошибка при изменении статуса:', error);
        }
    };

    const resetTemplateForm = () => {
        setIsCreatingTemplate(false);
        setEditingTemplate(null);
        setTemplateForm({
            service_id: services[0]?.id || null,
            day: 'monday',
            hours_work: {},
            is_active: true
        });
        setTemplateError(null);
    };

    // Функции для работы с расписанием вручную
    const handleScheduleSlotClick = (time: string) => {
        setScheduleForm(prev => {
            const currentStatus = prev.slots[time] || 'unavailable';
            const nextStatus = 
                currentStatus === 'unavailable' ? 'available' :
                currentStatus === 'available' ? 'break' :
                currentStatus === 'break' ? 'unavailable' : 'unavailable';
            
            return {
                ...prev,
                slots: {
                    ...prev.slots,
                    [time]: nextStatus
                }
            };
        });
    };

    const handleCreateSchedule = async () => {
        setScheduleFormError(null);

        if (!scheduleForm.service_id) {
            setScheduleFormError('Выберите услугу');
            return;
        }

        if (!scheduleForm.date) {
            setScheduleFormError('Выберите дату');
            return;
        }

        // Фильтруем только выбранные слоты (не unavailable)
        const activeSlots = Object.fromEntries(
            Object.entries(scheduleForm.slots).filter(([, status]) => status !== 'unavailable')
        ) as Record<string, 'available' | 'break'>;

        if (Object.keys(activeSlots).length === 0) {
            setScheduleFormError('Выберите хотя бы один временной слот');
            return;
        }

        setIsScheduleSubmitting(true);
        try {
            await serviceDatesApi.create({
                service_id: scheduleForm.service_id!,
                date: scheduleForm.date,
                slots: activeSlots
            });
            await refreshSchedule();
            setIsCreatingSchedule(false);
            setScheduleForm({
                service_id: services[0]?.id || null,
                date: weekDays[0]?.date || '',
                slots: {}
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Не удалось создать расписание';
            setScheduleFormError(message);
        } finally {
            setIsScheduleSubmitting(false);
        }
    };

    const resetScheduleForm = () => {
        setIsCreatingSchedule(false);
        setScheduleForm({
            service_id: services[0]?.id || null,
            date: weekDays[0]?.date || '',
            slots: {}
        });
        setScheduleFormError(null);
    };

    const renderServicesTab = () => (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Ваши услуги</h2>
                    <p className="text-gray-500">
                        {services.length
                            ? 'Редактируйте существующие или добавьте новые'
                            : 'Услуги пока не созданы'}
                    </p>
                </div>
                <Button
                    variant={isCreatingService ? 'secondary' : 'outline'}
                    onClick={() => setIsCreatingService(prev => !prev)}
                >
                    {isCreatingService ? 'Скрыть форму' : 'Добавить услугу'}
                </Button>
            </div>

            {isCreatingService && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Новая услуга
                        </h3>
                        <p className="text-sm text-gray-500">
                            Заполните основные данные, чтобы клиенты увидели услугу в каталоге.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleCreateService}>
                            <Input
                                label="Название"
                                name="title"
                                value={serviceForm.title}
                                onChange={handleServiceFormChange}
                                required
                            />
                            <Input
                                label="Краткое описание"
                                name="description"
                                value={serviceForm.description}
                                onChange={handleServiceFormChange}
                                required
                            />
                            <Input
                                label="Цена, ₽"
                                name="price"
                                type="number"
                                min={0}
                                value={serviceForm.price}
                                onChange={handleServiceFormChange}
                                required
                            />
                            <Input
                                label="URL фото (опционально)"
                                name="photo"
                                value={serviceForm.photo}
                                onChange={handleServiceFormChange}
                                placeholder="https://..."
                            />

                            {serviceFormError && (
                                <p className="text-sm text-red-600">{serviceFormError}</p>
                            )}

                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreatingService(false)}
                                >
                                    Отмена
                                </Button>
                                <Button type="submit" disabled={isServiceSubmitting}>
                                    {isServiceSubmitting ? 'Создаём...' : 'Создать услугу'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {services.length === 0 ? (
                <Card>
                    <CardContent>
                        <p className="text-gray-600">
                            Чтобы попасть в витрину мастеров, создайте первую услугу.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {services.map(service => (
                        <Card key={service.id} className="flex flex-col">
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                    {service.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Создано: {formatDate(service.created_at)}
                                </p>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 flex-1">
                                <p className="text-2xl font-bold text-gray-900">
                                    {priceFormatter.format(service.price)}
                                </p>
                                <Button
                                    variant="outline"
                                    disabled
                                    title="Редактирование станет доступно после подключения PATCH API"
                                >
                                    Редактировать
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );

    const renderScheduleTab = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                    <label className="text-sm text-gray-500">Фильтр по услуге:</label>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                        value={scheduleServiceFilter}
                        onChange={event => {
                            const value = event.target.value;
                            setScheduleServiceFilter(value === 'all' ? 'all' : Number(value));
                        }}
                    >
                        <option value="all">Все услуги</option>
                        {services.map(service => (
                            <option key={service.id} value={service.id}>
                                {service.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant={isCreatingSchedule ? 'secondary' : 'outline'}
                        onClick={() => setIsCreatingSchedule(prev => !prev)}
                        disabled={services.length === 0}
                    >
                        {isCreatingSchedule ? 'Скрыть форму' : 'Создать вручную'}
                    </Button>
                    <Button variant="outline" onClick={refreshSchedule} disabled={isScheduleLoading}>
                        {isScheduleLoading ? 'Обновляем...' : 'Обновить'}
                    </Button>
                </div>
            </div>

            {isCreatingSchedule && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Создать расписание вручную
                        </h3>
                        <p className="text-sm text-gray-500">
                            Выберите услугу, дату и настройте временные слоты
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Услуга
                                </label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                    value={scheduleForm.service_id || ''}
                                    onChange={e => setScheduleForm(prev => ({
                                        ...prev,
                                        service_id: Number(e.target.value)
                                    }))}
                                >
                                    <option value="">Выберите услугу</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    День недели
                                </label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                    value={scheduleForm.date}
                                    onChange={e => setScheduleForm(prev => ({
                                        ...prev,
                                        date: e.target.value
                                    }))}
                                >
                                    {weekDays.map(day => (
                                        <option key={day.date} value={day.date}>
                                            {day.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">
                                Временные слоты (нажмите для изменения статуса)
                            </label>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                {timeSlots.map(time => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => handleScheduleSlotClick(time)}
                                        className={`p-3 rounded-lg text-white text-sm font-medium transition-colors ${
                                            statusColors[scheduleForm.slots[time] || 'unavailable']
                                        }`}
                                    >
                                        {time}
                                        <div className="text-xs opacity-90 mt-1">
                                            {statusLabels[scheduleForm.slots[time] || 'unavailable']}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {scheduleFormError && (
                            <p className="text-sm text-red-600">{scheduleFormError}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={resetScheduleForm}
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={handleCreateSchedule}
                                disabled={isScheduleSubmitting}
                            >
                                {isScheduleSubmitting ? 'Создание...' : 'Создать расписание'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {scheduleError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {scheduleError}
                </div>
            )}

            {!scheduleError && filteredSchedule.length === 0 && (
                <Card>
                    <CardContent>
                        <p className="text-gray-600">
                            Расписание пока не создано. Создайте шаблон или дату в панели администратора сервиса,
                            после чего здесь появятся итоговые слоты.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {filteredSchedule.map(date => {
                    const stats = Object.values(date.slots).reduce<Record<string, number>>((acc, status) => {
                        acc[status] = (acc[status] ?? 0) + 1;
                        return acc;
                    }, {});

                    const boundService = services.find(service => service.id === date.service_id);

                    return (
                        <Card key={`${date.service_id}-${date.date}`}>
                            <CardHeader>
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {boundService ? boundService.title : `Услуга #${date.service_id}`}
                                        </p>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {formatDate(date.date)}
                                        </h3>
                                    </div>
                                    <div className="flex gap-2">
                                        {Object.entries(stats).map(([status, count]) => (
                                            <span
                                                key={status}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge[status] ?? 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {status}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-gray-500">
                                    Всего слотов: {Object.keys(date.slots).length}
                                </p>
                                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 text-center text-xs text-gray-600">
                                    {Object.entries(date.slots).map(([slot, status]) => (
                                        <div
                                            key={slot}
                                            className={`rounded-md px-2 py-1 border text-[11px] font-medium ${
                                                status === 'available'
                                                    ? 'border-green-200 bg-green-50 text-green-700'
                                                    : status === 'booked'
                                                        ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                                                        : 'border-gray-200 bg-gray-50 text-gray-500'
                                            }`}
                                        >
                                            <p>{slot}</p>
                                            <p className="uppercase">{status.slice(0, 3)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );

    const renderTemplatesTab = () => (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Шаблоны расписания</h2>
                    <p className="text-gray-500">
                        Создавайте шаблоны для автоматического заполнения расписания
                    </p>
                </div>
                <div className="flex gap-3">
                    {services.length > 0 && (
                        <select
                            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                            value={templateServiceFilter}
                            onChange={e => setTemplateServiceFilter(
                                e.target.value === 'all' ? 'all' : Number(e.target.value)
                            )}
                        >
                            <option value="all">Все услуги</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.title}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button
                        onClick={() => setIsCreatingTemplate(true)}
                        disabled={services.length === 0}
                    >
                        + Создать шаблон
                    </Button>
                </div>
            </div>

            {isCreatingTemplate && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingTemplate ? 'Редактирование шаблона' : 'Новый шаблон'}
                        </h3>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Услуга
                                </label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                    value={templateForm.service_id || ''}
                                    onChange={e => setTemplateForm(prev => ({
                                        ...prev,
                                        service_id: Number(e.target.value)
                                    }))}
                                >
                                    <option value="">Выберите услугу</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    День недели
                                </label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                    value={templateForm.day}
                                    onChange={e => setTemplateForm(prev => ({
                                        ...prev,
                                        day: e.target.value
                                    }))}
                                >
                                    {Object.entries(dayLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">
                                Временные слоты (нажмите для изменения статуса)
                            </label>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                {timeSlots.map(time => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => handleTimeSlotClick(time)}
                                        className={`p-3 rounded-lg text-white text-sm font-medium transition-colors ${
                                            statusColors[templateForm.hours_work[time] || 'unavailable']
                                        }`}
                                    >
                                        {time}
                                        <div className="text-xs opacity-90 mt-1">
                                            {statusLabels[templateForm.hours_work[time] || 'unavailable']}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={templateForm.is_active}
                                onChange={e => setTemplateForm(prev => ({
                                    ...prev,
                                    is_active: e.target.checked
                                }))}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700">
                                Шаблон активен
                            </label>
                        </div>

                        {templateError && (
                            <p className="text-sm text-red-600">{templateError}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={resetTemplateForm}
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                                disabled={isTemplateSubmitting}
                            >
                                {isTemplateSubmitting ? 'Сохранение...' : 
                                 editingTemplate ? 'Обновить шаблон' : 'Создать шаблон'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {Object.keys(templatesByService).length === 0 ? (
                <Card>
                    <CardContent>
                        <p className="text-gray-600 text-center py-8">
                            {services.length === 0 
                                ? 'Создайте услугу, чтобы добавить шаблон расписания'
                                : 'Шаблоны пока не созданы'
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(templatesByService).map(([serviceId, templates]) => {
                        const service = services.find(s => s.id === Number(serviceId));
                        return (
                            <div key={serviceId} className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                    {service?.title}
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {templates.map(template => (
                                        <Card key={template.id} className="relative">
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">
                                                            {dayLabels[template.day] || template.day}
                                                        </h4>
                                                        <p className={`text-sm ${
                                                            template.is_active 
                                                                ? 'text-green-600' 
                                                                : 'text-gray-500'
                                                        }`}>
                                                            {template.is_active ? 'Активен' : 'Неактивен'}
                                                        </p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        template.is_active
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {Object.keys(template.hours_work).length} слотов
                                                    </span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(template.hours_work)
                                                        .slice(0, 6)
                                                        .map(([time, status]) => (
                                                        <span
                                                            key={time}
                                                            className={`px-2 py-1 rounded text-xs ${
                                                                status === 'available'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : status === 'break'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                        >
                                                            {time}
                                                        </span>
                                                    ))}
                                                    {Object.keys(template.hours_work).length > 6 && (
                                                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                                            +{Object.keys(template.hours_work).length - 6}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEditTemplate(template)}
                                                    >
                                                        Изменить
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleToggleTemplateStatus(template)}
                                                    >
                                                        {template.is_active ? 'Выключить' : 'Включить'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                    >
                                                        Удалить
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderBookingsTab = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2 items-center">
                    <label className="text-sm text-gray-500">Услуга:</label>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                        value={bookingsServiceFilter ?? ''}
                        onChange={event => {
                            const value = event.target.value;
                            setBookingsServiceFilter(value ? Number(value) : null);
                        }}
                    >
                        {services.length === 0 && <option value="">Нет услуг</option>}
                        {services.map(service => (
                            <option key={service.id} value={service.id}>
                                {service.title}
                            </option>
                        ))}
                    </select>
                </div>
                <Button
                    variant="outline"
                    onClick={refreshSchedule}
                    disabled={isScheduleLoading}
                >
                    {isScheduleLoading ? 'Обновляем...' : 'Обновить слоты'}
                </Button>
            </div>

            {bookingsServiceFilter === null || services.length === 0 ? (
                <Card>
                    <CardContent>
                        <p className="text-gray-600">
                            Создайте услугу и выберите её, чтобы увидеть забронированные слоты.
                        </p>
                    </CardContent>
                </Card>
            ) : bookedSlots.length === 0 ? (
                <Card>
                    <CardContent>
                        <p className="text-gray-600">
                            Пока нет забронированных слотов. Как только пользователи начнут оформлять записи,
                            здесь появится их список. После подключения API добавим кнопки подтверждения и отмены.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {bookedSlots.map(booking => {
                        const service = services.find(item => item.id === booking.serviceId);
                        return (
                            <Card key={`${booking.serviceId}-${booking.date}-${booking.slot}`}>
                                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {service?.title ?? `Услуга #${booking.serviceId}`}
                                        </p>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {formatDate(booking.date)} в {booking.slot}
                                        </h3>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            size="sm"
                                            disabled
                                            title="Подтверждение брони появится после подключения API"
                                        >
                                            Принять
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled
                                            title="Отмена появится после подключения API"
                                        >
                                            Отклонить
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderBody = () => {
        switch (activeTab) {
            case 'schedule':
                return renderScheduleTab();
            case 'templates':
                return renderTemplatesTab();
            case 'bookings':
                return renderBookingsTab();
            default:
                return renderServicesTab();
        }
    };

    return (
        <div className="space-y-8">
            <section className="bg-[#252526] border border-[#3e3e42] rounded-xl p-8 shadow-xl">
                <div className="flex flex-wrap gap-6 items-center justify-between">
                    <div>
                        <p className="text-xs text-[#858585] uppercase tracking-[0.3em] mb-3 font-medium">
                            Панель мастера
                        </p>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#cccccc] to-[#858585] bg-clip-text text-transparent mb-3">
                            Управляйте услугами и расписанием
                        </h1>
                        <p className="text-[#858585] max-w-2xl">
                            Здесь собраны все рабочие инструменты мастера. Пока подключены только
                            отображение данных, но после интеграции API появится полноценное управление.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-[#007acc]/20 border border-[#007acc]/30 rounded-lg p-4 backdrop-blur-sm">
                        <p className="text-sm text-[#569cd6] mb-1">Услуги</p>
                        <p className="text-2xl font-bold text-[#cccccc]">{services.length}</p>
                    </div>
                    <div className="bg-[#4ec9b0]/20 border border-[#4ec9b0]/30 rounded-lg p-4 backdrop-blur-sm">
                        <p className="text-sm text-[#4ec9b0] mb-1">Шаблоны</p>
                        <p className="text-2xl font-bold text-[#cccccc]">{user.templates.length}</p>
                    </div>
                    <div className="bg-[#dcdcaa]/20 border border-[#dcdcaa]/30 rounded-lg p-4 backdrop-blur-sm">
                        <p className="text-sm text-[#dcdcaa] mb-1">Расписаний</p>
                        <p className="text-2xl font-bold text-[#cccccc]">{schedule.length}</p>
                    </div>
                    <div className="bg-[#569cd6]/20 border border-[#569cd6]/30 rounded-lg p-4 backdrop-blur-sm">
                        <p className="text-sm text-[#569cd6] mb-1">Бронирований</p>
                        <p className="text-2xl font-bold text-[#cccccc]">{bookedSlots.length}</p>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap gap-3">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-md text-sm font-semibold border transition-all duration-200 ${
                            activeTab === tab.id
                                ? 'bg-[#007acc] text-white border-[#007acc] shadow-lg shadow-[#007acc]/30'
                                : 'bg-[#252526] text-[#cccccc] border-[#3e3e42] hover:bg-[#2a2d2e] hover:border-[#464647]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {renderBody()}
        </div>
    );
};