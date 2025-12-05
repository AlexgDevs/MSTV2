import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useMasterSchedule } from '../../features/master/hooks/useMasterData';
import { servicesApi } from '../../api/services/services.api';
import { templatesApi } from '../../api/templates/templates.api';
import { serviceDatesApi } from '../../api/dates/dates.api';
import { enrollsApi } from '../../api/enrolls/enrolls.api';
import type { EnrollResponse } from '../../api/enrolls/types';
import { getCurrentWeekDays } from '../../utils/helpers';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import '../../assets/styles/MasterDashboardPage.css';

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

const timeSlots = [
    '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
];

const formatDate = (value: string) => {
    // Парсим формат dd-mm-YYYY
    const dateMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }
    }
    
    // Если формат не dd-mm-YYYY, пытаемся стандартный парсинг
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
    const [editingService, setEditingService] = useState<number | null>(null);
    const [serviceForm, setServiceForm] = useState({
        title: '',
        description: '',
        price: '',
        photo: ''
    });
    const [servicePhotoFile, setServicePhotoFile] = useState<File | null>(null);
    const [serviceFormError, setServiceFormError] = useState<string | null>(null);
    const [isServiceSubmitting, setIsServiceSubmitting] = useState(false);

    // Состояния для модального окна подтверждения
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'service' | 'template' | null;
        id: number | null;
        title: string;
    }>({
        isOpen: false,
        type: null,
        id: null,
        title: ''
    });

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

    // Состояния для записей (enrolls)
    const [enrolls, setEnrolls] = useState<EnrollResponse[]>([]);
    const [isLoadingEnrolls, setIsLoadingEnrolls] = useState(false);
    const [enrollsError, setEnrollsError] = useState<string | null>(null);

    // Загрузка записей для выбранной услуги
    useEffect(() => {
        const fetchEnrolls = async () => {
            if (!bookingsServiceFilter) {
                setEnrolls([]);
                return;
            }

            setIsLoadingEnrolls(true);
            setEnrollsError(null);
            try {
                const response = await enrollsApi.getByService(bookingsServiceFilter);
                setEnrolls(response.data);
            } catch (error: any) {
                setEnrollsError(error?.response?.data?.detail || 'Не удалось загрузить записи');
                console.error('Error fetching enrolls:', error);
            } finally {
                setIsLoadingEnrolls(false);
            }
        };

        fetchEnrolls();
    }, [bookingsServiceFilter]);

    const handleProcessEnroll = async (enrollId: number, action: 'accept' | 'reject') => {
        try {
            await enrollsApi.process(enrollId, action);
            // Обновляем список записей
            if (bookingsServiceFilter) {
                const response = await enrollsApi.getByService(bookingsServiceFilter);
                setEnrolls(response.data);
            }
            // Обновляем расписание
            await refreshSchedule();
        } catch (error: any) {
            const message = error?.response?.data?.detail || `Не удалось ${action === 'accept' ? 'принять' : 'отклонить'} запись`;
            alert(message);
            console.error('Error processing enroll:', error);
        }
    };

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
            if (editingService) {
                // Редактирование существующей услуги
                await servicesApi.update(editingService, {
                    title: serviceForm.title.trim(),
                    description: serviceForm.description.trim(),
                    price,
                    photo: serviceForm.photo.trim() || null
                }, servicePhotoFile || undefined);
            } else {
                // Создание новой услуги
                await servicesApi.create({
                    title: serviceForm.title.trim(),
                    description: serviceForm.description.trim(),
                    price,
                    photo: serviceForm.photo.trim() || ''
                }, servicePhotoFile || undefined);
            }
            await refreshUser();
            setServiceForm({
                title: '',
                description: '',
                price: '',
                photo: ''
            });
            setServicePhotoFile(null);
            setIsCreatingService(false);
            setEditingService(null);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : (editingService ? 'Не удалось обновить услугу' : 'Не удалось создать услугу');
            setServiceFormError(message);
        } finally {
            setIsServiceSubmitting(false);
        }
    };

    const handleEditService = (service: any) => {
        setEditingService(service.id);
        setServiceForm({
            title: service.title,
            description: service.description,
            price: service.price.toString(),
            photo: service.photo || ''
        });
        setIsCreatingService(true);
        setServiceFormError(null);
    };

    const handleCancelServiceForm = () => {
        setIsCreatingService(false);
        setEditingService(null);
        setServiceForm({
            title: '',
            description: '',
            price: '',
            photo: ''
        });
        setServiceFormError(null);
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

    const handleDeleteTemplate = (templateId: number) => {
        const template = user?.templates?.find(t => t.id === templateId);
        const dayLabel = template ? dayLabels[template.day] || template.day : 'шаблон';
        setDeleteModal({
            isOpen: true,
            type: 'template',
            id: templateId,
            title: `Удалить шаблон "${dayLabel}"?`
        });
    };

    const handleDeleteService = (serviceId: number) => {
        const service = services.find(s => s.id === serviceId);
        setDeleteModal({
            isOpen: true,
            type: 'service',
            id: serviceId,
            title: `Удалить услугу "${service?.title || 'услугу'}"?`
        });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id || !deleteModal.type) return;

        try {
            if (deleteModal.type === 'service') {
                await servicesApi.delete(deleteModal.id);
            } else if (deleteModal.type === 'template') {
                await templatesApi.delete(deleteModal.id);
            }
            await refreshUser();
            setDeleteModal({ isOpen: false, type: null, id: null, title: '' });
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            const message = error instanceof Error ? error.message : 'Не удалось удалить';
            if (deleteModal.type === 'service') {
                setServiceFormError(message);
            } else {
                setTemplateError(message);
            }
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ isOpen: false, type: null, id: null, title: '' });
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
        <div className="tab-content">
            <div className="tab-header">
                <div>
                    <h2>Ваши услуги</h2>
                    <p className="tab-description">
                        {services.length
                            ? 'Редактируйте существующие или добавьте новые'
                            : 'Услуги пока не созданы'}
                    </p>
                </div>
                <button
                    className={`btn ${isCreatingService ? 'btn-secondary' : 'btn-outline'}`}
                    onClick={() => setIsCreatingService(prev => !prev)}
                >
                    {isCreatingService ? 'Скрыть форму' : 'Добавить услугу'}
                </button>
            </div>

            {isCreatingService && (
                <div className="card">
                    <div className="card-header">
                        <h3>{editingService ? 'Редактирование услуги' : 'Новая услуга'}</h3>
                        <p className="card-description">
                            {editingService 
                                ? 'Измените данные услуги и сохраните изменения.'
                                : 'Заполните основные данные, чтобы клиенты увидели услугу в каталоге.'}
                        </p>
                    </div>
                    
                    <div className="card-content">
                        <form className="service-form" onSubmit={handleCreateService}>
                            <div className="form-group">
                                <label>Название услуги</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={serviceForm.title}
                                    onChange={handleServiceFormChange}
                                    required
                                    placeholder="Например: Маникюр"
                                />
                            </div>

                            <div className="form-group">
                                <label>Краткое описание</label>
                                <input
                                    type="text"
                                    name="description"
                                    value={serviceForm.description}
                                    onChange={handleServiceFormChange}
                                    required
                                    placeholder="Опишите услугу кратко"
                                />
                            </div>

                            <div className="form-group">
                                <label>Цена, ₽</label>
                                <input
                                    type="number"
                                    name="price"
                                    min={0}
                                    value={serviceForm.price}
                                    onChange={handleServiceFormChange}
                                    required
                                    placeholder="5000"
                                />
                            </div>

                            <div className="form-group">
                                <label>Фото услуги (опционально)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                // Проверяем размер (4 МБ)
                                                if (file.size > 4 * 1024 * 1024) {
                                                    setServiceFormError('Размер файла не должен превышать 4 МБ');
                                                    return;
                                                }
                                                setServicePhotoFile(file);
                                                setServiceForm(prev => ({ ...prev, photo: '' }));
                                            }
                                        }}
                                        style={{ marginBottom: '0.5rem' }}
                                    />
                                    {servicePhotoFile && (
                                        <div style={{ fontSize: '0.875rem', color: '#858585' }}>
                                            Выбран файл: {servicePhotoFile.name}
                                            <button
                                                type="button"
                                                onClick={() => setServicePhotoFile(null)}
                                                style={{ marginLeft: '0.5rem', color: '#f5576c', cursor: 'pointer' }}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.75rem', color: '#858585', marginTop: '0.25rem' }}>
                                        Или введите URL:
                                    </div>
                                    <input
                                        type="url"
                                        name="photo"
                                        value={serviceForm.photo}
                                        onChange={(e) => {
                                            handleServiceFormChange(e);
                                            if (e.target.value) {
                                                setServicePhotoFile(null);
                                            }
                                        }}
                                        placeholder="https://example.com/photo.jpg"
                                        disabled={!!servicePhotoFile}
                                    />
                                </div>
                            </div>

                            {serviceFormError && (
                                <div className="error-message">
                                    {serviceFormError}
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleCancelServiceForm}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={isServiceSubmitting}
                                    className="btn btn-primary"
                                >
                                    {isServiceSubmitting ? (
                                        <>
                                            <div className="spinner"></div>
                                            <span>{editingService ? 'Сохраняем...' : 'Создаём...'}</span>
                                        </>
                                    ) : (
                                        editingService ? 'Сохранить изменения' : 'Создать услугу'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {services.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <span>+</span>
                    </div>
                    <p className="empty-state-title">Услуги пока не созданы</p>
                    <p className="empty-state-description">
                        Чтобы попасть в витрину мастеров, создайте первую услугу.
                    </p>
                </div>
            ) : (
                <div className="services-grid">
                    {services.map(service => {
                        // Функция для получения URL изображения
                        const getImageUrl = () => {
                            if (service.photo?.startsWith('http')) {
                                return service.photo;
                            }
                            if (service.photo?.startsWith('data:') || service.photo?.startsWith('blob:')) {
                                return service.photo;
                            }
                            if (service.photo) {
                                const baseStatic =
                                    import.meta.env.VITE_STATIC_URL ||
                                    import.meta.env.VITE_API_URL?.replace('/api/v1', '') ||
                                    '';
                                return `${baseStatic}${service.photo}`;
                            }
                            return null;
                        };
                        const imageUrl = getImageUrl();
                        
                        return (
                            <div key={service.id} className="service-card">
                                {imageUrl && (
                                    <div className="service-card-image">
                                        <img
                                            src={imageUrl}
                                            alt={service.title}
                                            className="service-card-image-img"
                                        />
                                    </div>
                                )}
                                <div className="service-card-header">
                                    <h3 className="service-card-title">{service.title}</h3>
                                    <span className="service-card-date">
                                        Создано: {formatDate(service.created_at)}
                                    </span>
                                </div>
                                <div className="service-card-body">
                                    {service.description && (
                                        <p className="service-card-description">
                                            {service.description.length > 100 
                                                ? `${service.description.slice(0, 97)}...` 
                                                : service.description}
                                        </p>
                                    )}
                                    <div className="service-card-footer">
                                        <span className="service-card-price">
                                            {priceFormatter.format(service.price)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ padding: '0 20px 20px 20px', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                    <button
                                        onClick={() => handleEditService(service)}
                                        className="btn btn-outline"
                                        style={{ width: '100%' }}
                                    >
                                        Редактировать
                                    </button>
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="btn btn-danger"
                                        style={{ width: '100%' }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderScheduleTab = () => {
        const scheduleByService = filteredSchedule.reduce((acc, date) => {
            const serviceId = date.service_id;
            if (!acc[serviceId]) {
                acc[serviceId] = [];
            }
            acc[serviceId].push(date);
            return acc;
        }, {} as Record<number, typeof filteredSchedule>);

        return (
            <div className="tab-content">
                <div className="tab-header">
                    <div>
                        <h2>Расписание</h2>
                        <p className="tab-description">Управляйте рабочими днями и временными слотами</p>
                    </div>
                    
                    <div className="schedule-controls">
                        {services.length > 0 && (
                            <select
                                className="select-filter"
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
                        )}
                        
                        <div className="schedule-buttons">
                            <button
                                className={`btn ${isCreatingSchedule ? 'btn-secondary' : 'btn-outline'}`}
                                onClick={() => setIsCreatingSchedule(prev => !prev)}
                                disabled={services.length === 0}
                            >
                                {isCreatingSchedule ? 'Скрыть' : 'Добавить вручную'}
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={refreshSchedule}
                                disabled={isScheduleLoading}
                            >
                                {isScheduleLoading ? (
                                    <>
                                        <div className="spinner"></div>
                                        <span>...</span>
                                    </>
                                ) : (
                                    'Обновить'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {isCreatingSchedule && (
                    <div className="card schedule-create-card">
                        <div className="card-header">
                            <h3>Создать расписание вручную</h3>
                            <p className="card-description">
                                Выберите услугу, дату и настройте временные слоты
                            </p>
                        </div>

                        <div className="card-content">
                            <div className="schedule-form-grid">
                                <div className="form-group">
                                    <label>Услуга</label>
                                    <select
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

                                <div className="form-group">
                                    <label>День недели</label>
                                    <select
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

                            <div className="time-slots-container">
                                <label>Временные слоты (нажмите для изменения статуса)</label>
                                <div className="time-slots-grid">
                                    {timeSlots.map(time => {
                                        const status = scheduleForm.slots[time] || 'unavailable';
                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => handleScheduleSlotClick(time)}
                                                className={`time-slot time-slot-${status}`}
                                            >
                                                <span className="time-slot-time">{time}</span>
                                                <span className="time-slot-status">
                                                    {status === 'available' ? 'Свободен' :
                                                     status === 'break' ? 'Перерыв' : 'Недоступен'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {scheduleFormError && (
                                <div className="error-message">
                                    {scheduleFormError}
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={resetScheduleForm}
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleCreateSchedule}
                                    disabled={isScheduleSubmitting}
                                    className="btn btn-primary"
                                >
                                    {isScheduleSubmitting ? (
                                        <>
                                            <div className="spinner"></div>
                                            <span>Создание...</span>
                                        </>
                                    ) : (
                                        'Создать расписание'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {scheduleError && (
                    <div className="error-alert">
                        {scheduleError}
                    </div>
                )}

                {!scheduleError && filteredSchedule.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <span>📅</span>
                        </div>
                        <p className="empty-state-title">Расписание пока не создано</p>
                        <p className="empty-state-description">
                            Создайте шаблон или дату в панели администратора сервиса,
                            после чего здесь появятся итоговые слоты.
                        </p>
                    </div>
                )}

                <div className="schedule-container">
                    {Object.entries(scheduleByService).map(([serviceId, dates]) => {
                        const service = services.find(s => s.id === Number(serviceId));
                        return (
                            <div key={serviceId} className="schedule-service-section">
                                <h3 className="schedule-service-title">
                                    {service?.title || `Услуга #${serviceId}`}
                                </h3>
                                <div className="schedule-days-grid">
                                    {dates.map(date => {
                                        const slots = date.slots;
                                        const totalSlots = Object.keys(slots).length;
                                        const availableSlots = Object.values(slots).filter(s => s === 'available').length;
                                        const bookedSlotsCount = Object.values(slots).filter(s => s === 'booked').length;
                                        const breakSlots = Object.values(slots).filter(s => s === 'break').length;
                                        
                                        return (
                                            <div key={`${serviceId}-${date.date}`} className="schedule-day-card">
                                                <div className="schedule-day-header">
                                                    <div className="schedule-day-info">
                                                        <h4 className="schedule-day-title">{formatDate(date.date)}</h4>
                                                        <div className="schedule-stats">
                                                            <span className="stat-total">{totalSlots} всего</span>
                                                            <span className="stat-available">{availableSlots} свободно</span>
                                                            <span className="stat-booked">{bookedSlotsCount} занято</span>
                                                            {breakSlots > 0 && (
                                                                <span className="stat-break">{breakSlots} перерыв</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="schedule-slots">
                                                    {Object.entries(slots).map(([slot, status]) => (
                                                        <div
                                                            key={slot}
                                                            className={`schedule-slot schedule-slot-${status}`}
                                                        >
                                                            {slot}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTemplatesTab = () => (
        <div className="tab-content">
            <div className="tab-header">
                <div>
                    <h2>Шаблоны расписания</h2>
                    <p className="tab-description">
                        Создавайте шаблоны для автоматического заполнения расписания
                    </p>
                </div>
                <div className="template-controls">
                    {services.length > 0 && (
                        <select
                            className="select-filter"
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
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsCreatingTemplate(true)}
                        disabled={services.length === 0}
                    >
                        <span>+</span>
                        <span>Создать шаблон</span>
                    </button>
                </div>
            </div>

            {isCreatingTemplate && (
                <div className="card template-create-card">
                    <div className="card-header">
                        <h3>{editingTemplate ? 'Редактирование шаблона' : 'Новый шаблон'}</h3>
                        <p className="card-description">
                            Настройте дни и время работы для автоматического создания расписания
                        </p>
                    </div>

                    <div className="card-content">
                        <div className="template-form-grid">
                            <div className="form-group">
                                <label>Услуга</label>
                                <select
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

                            <div className="form-group">
                                <label>День недели</label>
                                <select
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

                        <div className="time-slots-container">
                            <label>Временные слоты (нажмите для изменения статуса)</label>
                            <div className="time-slots-grid-large">
                                {timeSlots.map(time => {
                                    const status = templateForm.hours_work[time] || 'unavailable';
                                    return (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => handleTimeSlotClick(time)}
                                            className={`time-slot time-slot-${status}`}
                                        >
                                            <span className="time-slot-time">{time}</span>
                                            <span className="time-slot-status">
                                                {status === 'available' ? 'Свободен' :
                                                 status === 'break' ? 'Перерыв' : 'Недоступен'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="form-checkbox">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={templateForm.is_active}
                                onChange={e => setTemplateForm(prev => ({
                                    ...prev,
                                    is_active: e.target.checked
                                }))}
                            />
                            <label htmlFor="is_active">Шаблон активен</label>
                        </div>

                        {templateError && (
                            <div className="error-message">
                                {templateError}
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={resetTemplateForm}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                                disabled={isTemplateSubmitting}
                                className="btn btn-primary"
                            >
                                {isTemplateSubmitting ? (
                                    <>
                                        <div className="spinner"></div>
                                        <span>Сохранение...</span>
                                    </>
                                ) : editingTemplate ? (
                                    'Обновить шаблон'
                                ) : (
                                    'Создать шаблон'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {Object.keys(templatesByService).length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <span>📋</span>
                    </div>
                    <p className="empty-state-title">
                        {services.length === 0 
                            ? 'Создайте услугу, чтобы добавить шаблон расписания'
                            : 'Шаблоны пока не созданы'
                        }
                    </p>
                </div>
            ) : (
                <div className="templates-container">
                    {Object.entries(templatesByService).map(([serviceId, templates]) => {
                        const service = services.find(s => s.id === Number(serviceId));
                        return (
                            <div key={serviceId} className="template-service-section">
                                <h3 className="template-service-title">
                                    {service?.title}
                                </h3>
                                <div className="templates-grid">
                                    {templates.map(template => (
                                        <div key={template.id} className="template-card">
                                            <div className="template-card-header">
                                                <div>
                                                    <h4 className="template-card-title">
                                                        {dayLabels[template.day] || template.day}
                                                    </h4>
                                                    <span className={`template-status ${template.is_active ? 'active' : 'inactive'}`}>
                                                        {template.is_active ? 'Активен' : 'Неактивен'}
                                                    </span>
                                                </div>
                                                <span className="template-slots-count">
                                                    {Object.keys(template.hours_work).length} слотов
                                                </span>
                                            </div>
                                            
                                            <div className="template-slots-preview">
                                                {Object.entries(template.hours_work)
                                                    .map(([time, status]) => (
                                                    <span
                                                        key={time}
                                                        className={`template-slot template-slot-${status}`}
                                                    >
                                                        {time}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            <div className="template-actions">
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => handleEditTemplate(template)}
                                                >
                                                    Изменить
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => handleToggleTemplateStatus(template)}
                                                >
                                                    {template.is_active ? 'Выключить' : 'Включить'}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </div>
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
        <div className="tab-content">
            <div className="tab-header">
                <div>
                    <h2>Бронирования</h2>
                    <p className="tab-description">Просмотр и управление забронированными слотами</p>
                </div>
                
                <div className="bookings-controls">
                    <select
                        className="select-filter"
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
                    
                    <button
                        className="btn btn-outline"
                        onClick={refreshSchedule}
                        disabled={isScheduleLoading}
                    >
                        {isScheduleLoading ? (
                            <>
                                <div className="spinner"></div>
                                <span>...</span>
                            </>
                        ) : (
                            'Обновить слоты'
                        )}
                    </button>
                </div>
            </div>

            {bookingsServiceFilter === null || services.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <span>📅</span>
                    </div>
                    <p className="empty-state-title">Создайте услугу и выберите её</p>
                    <p className="empty-state-description">
                        Чтобы увидеть забронированные слоты, создайте услугу и выберите её в фильтре.
                    </p>
                </div>
            ) : isLoadingEnrolls ? (
                <div className="empty-state">
                    <div className="spinner"></div>
                    <p className="empty-state-title">Загрузка записей...</p>
                </div>
            ) : enrollsError ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <span>⚠️</span>
                    </div>
                    <p className="empty-state-title">Ошибка загрузки</p>
                    <p className="empty-state-description">{enrollsError}</p>
                </div>
            ) : enrolls.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <span>👥</span>
                    </div>
                    <p className="empty-state-title">Пока нет записей</p>
                    <p className="empty-state-description">
                        Как только пользователи начнут оформлять записи, здесь появится их список.
                    </p>
                </div>
            ) : (
                <div className="bookings-list">
                    {enrolls.map(enroll => {
                        const service = services.find(item => item.id === enroll.service_id);
                        const statusLabels: Record<string, string> = {
                            pending: 'Ожидает',
                            confirmed: 'Подтверждено',
                            completed: 'Завершено',
                            cancelled: 'Отменено',
                            expired: 'Истекло'
                        };
                        const statusColors: Record<string, string> = {
                            pending: 'btn-warning',
                            confirmed: 'btn-success',
                            completed: 'btn-info',
                            cancelled: 'btn-danger',
                            expired: 'btn-secondary'
                        };
                        
                        return (
                            <div key={enroll.id} className="booking-card">
                                <div className="booking-info">
                                    <p className="booking-service">
                                        {service?.title ?? `Услуга #${enroll.service_id}`}
                                    </p>
                                    <h3 className="booking-time">
                                        {enroll.slot_time}
                                    </h3>
                                    {enroll.user && (
                                        <p className="booking-user">
                                            Клиент: {enroll.user.name}
                                        </p>
                                    )}
                                    <p className="booking-price">
                                        {priceFormatter.format(enroll.price)}
                                    </p>
                                    <span className={`status-badge ${statusColors[enroll.status] || ''}`}>
                                        {statusLabels[enroll.status] || enroll.status}
                                    </span>
                                </div>
                                <div className="booking-actions">
                                    {enroll.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleProcessEnroll(enroll.id, 'accept')}
                                                className="btn btn-primary"
                                            >
                                                Принять
                                            </button>
                                            <button
                                                onClick={() => handleProcessEnroll(enroll.id, 'reject')}
                                                className="btn btn-danger"
                                            >
                                                Отклонить
                                            </button>
                                        </>
                                    )}
                                    {enroll.status !== 'pending' && (
                                        <span className="booking-status-text">
                                            {statusLabels[enroll.status] || enroll.status}
                                        </span>
                                    )}
                                </div>
                            </div>
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
        <div className="master-dashboard">
            <div className="dashboard-container">
                {/* Header Section */}
                <div className="dashboard-header">
                    <div className="header-content">
                        <div className="header-badge">
                            Панель мастера
                        </div>
                        <h1 className="header-title">
                            Управляйте услугами и расписанием
                        </h1>
                        <p className="header-description">
                            Здесь собраны все рабочие инструменты мастера. Пока подключены только
                            отображение данных, но после интеграции API появится полноценное управление.
                        </p>
                    </div>
                    
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Услуги</div>
                            <div className="stat-value">{services.length}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Шаблоны</div>
                            <div className="stat-value">{user.templates.length}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Расписаний</div>
                            <div className="stat-value">{schedule.length}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Бронирований</div>
                            <div className="stat-value">{bookedSlots.length}</div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="dashboard-content">
                    {renderBody()}
                </div>
            </div>

            {/* Модальное окно подтверждения удаления */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.title}
                message={
                    deleteModal.type === 'service'
                        ? 'Вы уверены, что хотите удалить эту услугу? Это действие нельзя отменить. Все связанные шаблоны, расписание и записи также будут удалены.'
                        : 'Вы уверены, что хотите удалить этот шаблон? Это действие нельзя отменить.'
                }
                confirmText="Удалить"
                cancelText="Отмена"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
            />
        </div>
    );
};