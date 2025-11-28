import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useMasterSchedule } from '../../features/master/hooks/useMasterData';
import { servicesApi } from '../../api/services/services.api';
import { templatesApi } from '../../api/templates/templates.api';

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
    saturday: 'Суббота',
    sunday: 'Воскресенье'
};

const statusBadge: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    booked: 'bg-yellow-100 text-yellow-800',
    break: 'bg-red-100 text-red-700',
    unavailable: 'bg-gray-100 text-gray-600'
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
    const [isConfirmed, setIsConfirmed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return localStorage.getItem('master-panel-confirmed') === 'true';
    });

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

    const [templateFormServiceId, setTemplateFormServiceId] = useState<number | null>(null);
    const [templateForm, setTemplateForm] = useState({
        day: 'monday',
        hours: '10:00, 11:00, 12:00',
        isActive: true
    });
    const [isTemplateSubmitting, setIsTemplateSubmitting] = useState(false);
    const [templateError, setTemplateError] = useState<string | null>(null);

    useEffect(() => {
        if (services.length && bookingsServiceFilter === null) {
            setBookingsServiceFilter(services[0].id);
        }
    }, [services, bookingsServiceFilter]);

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

    const templatesByService = useMemo(() => {
        const templates = user?.templates ?? [];
        return templates.reduce<Record<number, typeof templates>>((acc, template) => {
            if (!template.service_id) {
                return acc;
            }
            if (!acc[template.service_id]) {
                acc[template.service_id] = [];
            }
            acc[template.service_id].push(template);
            return acc;
        }, {});
    }, [user?.templates]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (isConfirmed) {
            localStorage.setItem('master-panel-confirmed', 'true');
        } else {
            localStorage.removeItem('master-panel-confirmed');
        }
    }, [isConfirmed]);

    if (!user) {
        return null;
    }

    if (!isConfirmed) {
        return (
            <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-6 shadow-sm">
                <p className="text-sm uppercase tracking-[0.3em] text-blue-500 font-semibold">
                    мастер-панель
                </p>
                <h1 className="text-3xl font-bold text-gray-900">
                    Включить режим мастера?
                </h1>
                <p className="text-gray-600 text-lg">
                    После подтверждения на этой странице появятся инструменты для управления услугами,
                    расписанием и бронированиями ваших клиентов.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Button onClick={() => setIsConfirmed(true)}>Перейти к панели</Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsConfirmed(false)}
                    >
                        Остаться в режиме клиента
                    </Button>
                </div>
                <p className="text-sm text-gray-400">
                    Решение можно изменить в любой момент — просто вернитесь на эту страницу.
                </p>
            </div>
        );
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

    const parseTemplateHours = (raw: string): Record<string, 'available'> => {
        const slots = raw
            .split(',')
            .map(slot => slot.trim())
            .filter(Boolean);

        const result: Record<string, 'available'> = {};
        for (const slot of slots) {
            result[slot] = 'available';
        }
        return result;
    };

    const handleCreateTemplate = async (serviceId: number) => {
        setTemplateError(null);
        const hours_work = parseTemplateHours(templateForm.hours);

        if (Object.keys(hours_work).length === 0) {
            setTemplateError('Укажите хотя бы один временной слот');
            return;
        }

        setIsTemplateSubmitting(true);
        try {
            await templatesApi.create({
                day: templateForm.day,
                hours_work,
                is_active: templateForm.isActive,
                service_id: serviceId
            });
            await refreshUser();
            setTemplateFormServiceId(null);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Не удалось создать шаблон';
            setTemplateError(message);
        } finally {
            setIsTemplateSubmitting(false);
        }
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
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                        {service.title}
                                    </h3>
                                    <span className="text-sm text-gray-500">
                                        #{service.id}
                                    </span>
                                </div>
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
                <Button variant="outline" onClick={refreshSchedule} disabled={isScheduleLoading}>
                    {isScheduleLoading ? 'Обновляем...' : 'Обновить'}
                </Button>
            </div>

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
            {services.length === 0 ? (
                <Card>
                    <CardContent>
                        <p className="text-gray-600">
                            Создайте услугу, чтобы добавить к ней шаблон расписания.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                services.map(service => {
                    const templates = templatesByService[service.id] ?? [];
                    const isActiveForm = templateFormServiceId === service.id;

                    return (
                        <Card key={service.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {service.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {templates.length
                                                ? `${templates.length} шаблон(ов)`
                                                : 'Шаблонов пока нет'}
                                        </p>
                                    </div>
                                    <Button
                                        variant={isActiveForm ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={() =>
                                            setTemplateFormServiceId(prev =>
                                                prev === service.id ? null : service.id
                                            )
                                        }
                                    >
                                        {isActiveForm ? 'Скрыть форму' : 'Добавить шаблон'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isActiveForm && (
                                    <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
                                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-600 uppercase">
                                                    День недели
                                                </label>
                                                <select
                                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                                    value={templateForm.day}
                                                    onChange={event =>
                                                        setTemplateForm(prev => ({
                                                            ...prev,
                                                            day: event.target.value
                                                        }))
                                                    }
                                                >
                                                    {Object.entries(dayLabels).map(([value, label]) => (
                                                        <option key={value} value={value}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-600 uppercase">
                                                    Слоты (через запятую)
                                                </label>
                                                <Input
                                                    name="hours"
                                                    value={templateForm.hours}
                                                    onChange={event =>
                                                        setTemplateForm(prev => ({
                                                            ...prev,
                                                            hours: event.target.value
                                                        }))
                                                    }
                                                    placeholder="Например: 10:00, 11:00, 12:00"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-600 uppercase">
                                                    Статус
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setTemplateForm(prev => ({
                                                            ...prev,
                                                            isActive: !prev.isActive
                                                        }))
                                                    }
                                                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold ${
                                                        templateForm.isActive
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {templateForm.isActive ? 'Активен' : 'Выключен'}
                                                </button>
                                            </div>
                                        </div>

                                        {templateError && (
                                            <p className="text-sm text-red-600">{templateError}</p>
                                        )}

                                        <div className="flex justify-end gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setTemplateFormServiceId(null)}
                                            >
                                                Отмена
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleCreateTemplate(service.id)}
                                                disabled={isTemplateSubmitting}
                                            >
                                                {isTemplateSubmitting ? 'Создаём...' : 'Создать шаблон'}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {templates.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        Слот-матрицы ещё не созданы. Сформируйте повторяющееся расписание,
                                        чтобы ускорить генерацию дат.
                                    </p>
                                ) : (
                                    templates.map(template => (
                                        <div
                                            key={template.id}
                                            className="border border-gray-200 rounded-xl p-4 space-y-2"
                                        >
                                            <div className="flex flex-wrap gap-3 items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        {dayLabels[template.day] ?? template.day}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        ID шаблона: {template.id}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        template.is_active
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}
                                                >
                                                    {template.is_active ? 'Активен' : 'Выключен'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                                {Object.entries(template.hours_work).map(([time, status]) => (
                                                    <span
                                                        key={time}
                                                        className={`px-3 py-1 rounded-full font-semibold ${
                                                            status === 'available'
                                                                ? 'bg-green-50 text-green-700'
                                                                : status === 'break'
                                                                    ? 'bg-red-50 text-red-600'
                                                                    : 'bg-gray-50 text-gray-500'
                                                        }`}
                                                    >
                                                        {time} — {status}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    );
                })
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
            <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="flex flex-wrap gap-6 items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-[0.3em] mb-2">
                            Панель мастера
                        </p>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Управляйте услугами и расписанием
                        </h1>
                        <p className="text-gray-600 max-w-2xl">
                            Здесь собраны все рабочие инструменты мастера. Пока подключены только
                            отображение данных, но после интеграции API появится полноценное управление.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setIsConfirmed(false)}>
                        Выйти из режима мастера
                    </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-blue-600">Услуги</p>
                        <p className="text-2xl font-bold text-blue-900">{services.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-green-600">Шаблоны</p>
                        <p className="text-2xl font-bold text-green-900">{user.templates.length}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4">
                        <p className="text-sm text-yellow-600">Расписаний</p>
                        <p className="text-2xl font-bold text-yellow-900">{schedule.length}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-sm text-purple-600">Бронирований</p>
                        <p className="text-2xl font-bold text-purple-900">{bookedSlots.length}</p>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap gap-3">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
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
