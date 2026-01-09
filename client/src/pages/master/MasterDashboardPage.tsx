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
import { CancelReasonModal } from '../../components/enrolls/CancelReasonModal';
import { CreateAccountModal } from '../../components/accounts/CreateAccountModal';
import { CalendarIcon, WarningIcon, ClipboardIcon, UsersIcon } from '../../components/icons/Icons';
import { CATEGORIES } from '../../components/categories/CategoriesSection';
import { chatsApi } from '../../api/chats/chats.api';
import { disputeChatApi } from '../../api/disputes/disputeChat.api';
import { ChatList } from '../../components/chats/ChatList';
import { accountsApi } from '../../api/accounts/accounts.api';
import type { UnifiedChatItem } from '../chats/ChatsPage';
import '../../assets/styles/MasterDashboardPage.css';

type TabId = 'services' | 'schedule' | 'templates' | 'bookings' | 'clients' | 'account';

const tabs: { id: TabId; label: string }[] = [
    { id: 'services', label: 'Мои услуги' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'templates', label: 'Шаблоны расписания' },
    { id: 'bookings', label: 'Бронирования' },
    { id: 'clients', label: 'Клиенты' },
    { id: 'account', label: 'Счет' },
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
    const { user, refreshUser, isLoading: isAuthLoading } = useAuthStore();
    const services = user?.services ?? [];
    const serviceIds = useMemo(() => services.map(service => service.id), [services]);

    // Показываем загрузку пока проверяется авторизация или email не подтвержден
    if (isAuthLoading || !user || !user.verified_email) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '50vh' 
            }}>
                <div>Загрузка...</div>
            </div>
        );
    }

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
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // Выбранные основные категории
    const [customTags, setCustomTags] = useState<string>(''); // Новые тэги через запятую
    const [servicePhotoFile, setServicePhotoFile] = useState<File | null>(null);
    const [servicePhotoPreview, setServicePhotoPreview] = useState<string | null>(null);
    const [serviceFormError, setServiceFormError] = useState<string | null>(null);
    const [isServiceSubmitting, setIsServiceSubmitting] = useState(false);
    const [showAccountRequiredModal, setShowAccountRequiredModal] = useState(false);

    // Chats state
    const [chats, setChats] = useState<UnifiedChatItem[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [chatsError, setChatsError] = useState<string | null>(null);

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

    // Состояние для модального окна создания счета
    const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);

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

    // Загрузка чатов при переключении на вкладку "Клиенты"
    const loadChats = async () => {
        if (!user) return;
        setIsLoadingChats(true);
        setChatsError(null);
        try {
            // Load both service and dispute chats
            const [serviceChatsResponse, disputeChatsResponse] = await Promise.all([
                chatsApi.getServiceChats().catch(() => ({ data: [] })),
                disputeChatApi.getAll().catch(() => ({ data: [] }))
            ]);

            const serviceChats: UnifiedChatItem[] = 
                (serviceChatsResponse.data || [])
                    .filter(chat => chat && chat.master_id === user.id)
                    .map(chat => ({ ...chat, type: 'service' as const }));

            const disputeChats: UnifiedChatItem[] = 
                (disputeChatsResponse.data || [])
                    .filter(chat => chat && chat.master_id === user.id)
                    .map(chat => ({ ...chat, type: 'dispute' as const }));

            const allChats = [...serviceChats, ...disputeChats].sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA;
            });

            setChats(allChats);
        } catch (error) {
            console.error('Error loading chats:', error);
            setChatsError(error instanceof Error ? error.message : 'Не удалось загрузить чаты');
            setChats([]);
        } finally {
            setIsLoadingChats(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'clients') {
            loadChats();
        }
    }, [activeTab, user]);

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

    useEffect(() => {
        if (servicePhotoFile) {
            const objectUrl = URL.createObjectURL(servicePhotoFile);
            setServicePhotoPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        setServicePhotoPreview(serviceForm.photo || null);
    }, [servicePhotoFile, serviceForm.photo]);

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
    const [cancelReasonModal, setCancelReasonModal] = useState<{
        isOpen: boolean;
        enrollId: number | null;
        enrollPrice: number;
        clientName: string;
        serviceTitle: string;
    }>({
        isOpen: false,
        enrollId: null,
        enrollPrice: 0,
        clientName: '',
        serviceTitle: ''
    });

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

    const handleProcessEnroll = (enrollId: number, action: 'accept' | 'reject') => {
        // Для отмены показываем модальное окно для выбора причины
        if (action === 'reject') {
            const enroll = enrolls.find(e => e.id === enrollId);
            if (enroll) {
                const service = services.find(s => s.id === enroll.service_id);
                setCancelReasonModal({
                    isOpen: true,
                    enrollId: enrollId,
                    enrollPrice: enroll.price,
                    clientName: enroll.user?.name || 'Клиент',
                    serviceTitle: service?.title ?? 'Услуга'
                });
                return;
            }
        }
        
        // Для принятия или если enroll не найден - выполняем сразу
        executeProcessEnroll(enrollId, action);
    };

    const executeProcessEnroll = async (enrollId: number, action: 'accept' | 'reject', reason?: string) => {
        try {
            await enrollsApi.process(enrollId, action, reason);
            // Обновляем список записей
            if (bookingsServiceFilter) {
                const response = await enrollsApi.getByService(bookingsServiceFilter);
                setEnrolls(response.data);
            }
            // Обновляем расписание
            await refreshSchedule();
            
            // Закрываем модальное окно если было открыто
            if (cancelReasonModal.isOpen) {
                setCancelReasonModal({
                    isOpen: false,
                    enrollId: null,
                    enrollPrice: 0,
                    clientName: '',
                    serviceTitle: ''
                });
            }
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

        // Check if user has an account (only for creating new service, not editing)
        if (!editingService) {
            try {
                await accountsApi.get();
            } catch (error: any) {
                // If account doesn't exist (404) or other error
                if (error?.response?.status === 404 || !error?.response) {
                    setServiceFormError('Для создания услуги необходимо сначала создать счет для получения денег');
                    setShowAccountRequiredModal(true);
                    return;
                }
                // If it's another error, show it
                const message = error?.response?.data?.detail || 'Ошибка при проверке счета';
                setServiceFormError(message);
                return;
            }
        }

        setIsServiceSubmitting(true);
        try {
            if (editingService) {
                // Редактирование существующей услуги
                await servicesApi.update(
                    editingService,
                    {
                        title: serviceForm.title.trim(),
                        description: serviceForm.description.trim(),
                        price,
                        photo: serviceForm.photo.trim() || null // если пользователь удалил фото, отправляем null
                    },
                    servicePhotoFile || undefined
                );
            } else {
                // Создание новой услуги
                await servicesApi.create(
                    {
                        title: serviceForm.title.trim(),
                        description: serviceForm.description.trim(),
                        price,
                        photo: serviceForm.photo.trim() || '',
                        existing_tags: selectedTags.length > 0 ? JSON.stringify(selectedTags) : undefined,
                        custom_tags: customTags.trim() ? JSON.stringify(customTags.split(',').map(t => t.trim()).filter(t => t.length > 0)) : undefined
                    },
                    servicePhotoFile || undefined
                );
            }
            await refreshUser();
            setServiceForm({
                title: '',
                description: '',
                price: '',
                photo: ''
            });
            setServicePhotoFile(null);
            setSelectedTags([]);
            setCustomTags('');
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
        setServicePhotoFile(null);
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
        setServicePhotoFile(null);
        setSelectedTags([]);
        setCustomTags('');
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
                                <label>Фото услуги</label>
                                <div className="file-upload-section">
                                    <label className="file-upload-dropzone">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 4 * 1024 * 1024) {
                                                        setServiceFormError('Размер файла не должен превышать 4 МБ');
                                                        return;
                                                    }
                                                    setServicePhotoFile(file);
                                                    setServiceForm(prev => ({ ...prev, photo: '' }));
                                                }
                                            }}
                                            className="file-input-hidden"
                                        />
                                        <div className="file-upload-content">
                                            <span className="file-upload-title">Загрузить фотографию</span>
                                            <span className="file-upload-hint">PNG, JPG до 4 МБ</span>
                                        </div>
                                    </label>

                                    {servicePhotoPreview && (
                                        <div className="file-preview">
                                            <img src={servicePhotoPreview} alt="Превью услуги" />
                                        </div>
                                    )}

                                    {(servicePhotoFile || serviceForm.photo) && (
                                        <div className="file-actions">
                                            {servicePhotoFile && (
                                                <span className="file-info">
                                                    Выбран файл: {servicePhotoFile.name}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setServicePhotoFile(null);
                                                    setServiceForm(prev => ({ ...prev, photo: '' }));
                                                }}
                                                className="file-remove-btn"
                                            >
                                                Удалить фото
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Категории (тэги)</label>
                                <div className="category-tags-container">
                                    <div className="category-tags-label">
                                        Выберите основные категории:
                                    </div>
                                    <div className="category-tags-grid">
                                        {CATEGORIES.map((category) => (
                                            <label
                                                key={category.id}
                                                className={`category-tag-item ${selectedTags.includes(category.title) ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTags.includes(category.title)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedTags(prev => [...prev, category.title]);
                                                        } else {
                                                            setSelectedTags(prev => prev.filter(t => t !== category.title));
                                                        }
                                                    }}
                                                />
                                                <span>{category.title}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="custom-tags-section">
                                        <div className="custom-tags-label">
                                            Или добавьте свои тэги (через запятую):
                                        </div>
                                        <input
                                            type="text"
                                            value={customTags}
                                            onChange={(e) => setCustomTags(e.target.value)}
                                            placeholder="Например: маникюр, педикюр, наращивание"
                                        />
                                    </div>
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
                        // Функция для получения URL изображения (идентична ServiceCard)
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
                        
                        // Получаем теги для этого сервиса из user.tags
                        const serviceTags = user?.tags?.filter(tag => tag.service_id === service.id) || [];
                        
                        return (
                            <div key={service.id} className="service-card">
                                {/* Image Section or Title Placeholder */}
                                <div className="service-image">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={service.title}
                                            className="service-image-img"
                                            loading="lazy"
                                            onError={(e) => {
                                                // Если изображение не загрузилось, показываем placeholder
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const placeholder = target.nextElementSibling as HTMLElement;
                                                if (placeholder && placeholder.classList.contains('service-title-placeholder')) {
                                                    placeholder.style.display = 'flex';
                                                }
                                            }}
                                        />
                                    ) : null}
                                    {!imageUrl && (
                                        <div className="service-title-placeholder">
                                            <span className="service-title-text">{service.title}</span>
                                        </div>
                                    )}
                                    <div className="service-price-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M12 6v6l4 2"/>
                                        </svg>
                                        {priceFormatter.format(service.price)}
                                    </div>
                                </div>

                                <div className="service-content">
                                    {/* Header - Title */}
                                    <div className="service-header">
                                        <h3 className="service-title">
                                            {service.title}
                                        </h3>
                                        <span className="service-id">
                                            #{service.id}
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    {serviceTags.length > 0 && (
                                        <div className="service-tags">
                                            {serviceTags.slice(0, 5).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="service-tag"
                                                >
                                                    #{tag.title}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Footer - Action Buttons */}
                                    <div className="service-footer">
                                        <button
                                            onClick={() => handleEditService(service)}
                                            className="service-action-btn"
                                        >
                                            Редактировать
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteService(service.id)}
                                            className="service-action-btn service-action-btn-danger"
                                        >
                                            Удалить
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                        </button>
                                    </div>
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
                            <CalendarIcon size={48} color="currentColor" />
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
                        <ClipboardIcon size={28} color="#737373" />
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
                        <CalendarIcon size={48} color="currentColor" />
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
                        <WarningIcon size={48} color="currentColor" />
                    </div>
                    <p className="empty-state-title">Ошибка загрузки</p>
                    <p className="empty-state-description">{enrollsError}</p>
                </div>
            ) : enrolls.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <UsersIcon size={48} color="currentColor" />
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
                            ready: 'Готово к подтверждению',
                            completed: 'Завершено',
                            cancelled: 'Отменено',
                            expired: 'Истекло'
                        };
                        const statusColors: Record<string, string> = {
                            pending: 'btn-warning',
                            confirmed: 'btn-success',
                            ready: 'btn-info',
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
                                    {enroll.status === 'confirmed' && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await enrollsApi.complete(enroll.id);
                                                    if (bookingsServiceFilter) {
                                                        const response = await enrollsApi.getByService(bookingsServiceFilter);
                                                        setEnrolls(response.data);
                                                    }
                                                } catch (error: any) {
                                                    alert(error?.response?.data?.detail || 'Не удалось подтвердить готовность');
                                                }
                                            }}
                                            className="btn btn-primary"
                                        >
                                            Подтвердить готовность
                                        </button>
                                    )}
                                    {enroll.status !== 'pending' && enroll.status !== 'confirmed' && (
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

    const renderClientsTab = () => (
        <div className="dashboard-clients">
            <div className="dashboard-section">
                <div className="section-header">
                    <h2 className="section-title">Мои клиенты</h2>
                    <p className="section-subtitle">
                        {chats.length ? `Всего чатов: ${chats.length}` : 'Чатов пока нет'}
                    </p>
                </div>
                <div className="section-content">
                    <ChatList
                        chats={chats}
                        isLoading={isLoadingChats}
                        error={chatsError}
                        currentUserId={user?.id || 0}
                        showMasterInfo={true}
                    />
                </div>
            </div>
        </div>
    );

    const renderAccountTab = () => (
        <div className="dashboard-account">
            <div className="dashboard-section">
                <div className="section-header">
                    <h2 className="section-title">Счет для выплат</h2>
                    <p className="section-subtitle">
                        Настройте способ получения выплат за выполненные услуги
                    </p>
                </div>
                <div className="section-content">
                    <div className="account-info">
                        <div className="info-card">
                            <h3 className="info-card-title">Информация о счете</h3>
                            <div className="info-card-content">
                                <p className="info-text">
                                    Для получения выплат необходимо настроить счет.
                                </p>
                                <p className="info-text">
                                    После подтверждения клиентом выполненной услуги, 
                                    средства будут автоматически переведены на указанный счет.
                                </p>
                                <div className="account-status">
                                    <span className="status-label">Статус счета:</span>
                                    <span className="status-value pending">Требуется настройка</span>
                                </div>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3 className="info-card-title">Способы выплат</h3>
                            <div className="info-card-content">
                                <ul className="payout-methods">
                                    <li>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                            <line x1="1" y1="10" x2="23" y2="10"/>
                                        </svg>
                                        <span>Банковская карта</span>
                                    </li>
                                    <li>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M12 6v6l4 2"/>
                                        </svg>
                                        <span>ЮMoney кошелек</span>
                                    </li>
                                    <li>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                        </svg>
                                        <span>СБП (Система быстрых платежей)</span>
                                    </li>
                                    <li>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                        <span>Банковский счет</span>
                                    </li>
                                    <li>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10 9 9 9 8 9"/>
                                        </svg>
                                        <span>Самозанятый</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3 className="info-card-title">Как это работает</h3>
                            <div className="info-card-content">
                                <ol className="workflow-steps">
                                    <li>Клиент оплачивает услугу → деньги удерживаются на счете платформы</li>
                                    <li>Вы выполняете услугу и отмечаете её как выполненную</li>
                                    <li>Клиент подтверждает выполнение услуги</li>
                                    <li>Средства автоматически переводятся на ваш счет</li>
                                </ol>
                            </div>
                        </div>

                        <div className="action-buttons">
                            <button 
                                className="btn btn-primary"
                                onClick={() => setIsCreateAccountModalOpen(true)}
                            >
                                Настроить счет
                            </button>
                        </div>
                    </div>
                </div>
            </div>
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
            case 'clients':
                return renderClientsTab();
            case 'account':
                return renderAccountTab();
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
                            Здесь собраны все рабочие инструменты мастера.
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

            {/* Модальное окно выбора причины отмены */}
            <CancelReasonModal
                isOpen={cancelReasonModal.isOpen}
                clientName={cancelReasonModal.clientName}
                serviceTitle={cancelReasonModal.serviceTitle}
                enrollPrice={cancelReasonModal.enrollPrice}
                onConfirm={(reason) => {
                    if (cancelReasonModal.enrollId) {
                        executeProcessEnroll(cancelReasonModal.enrollId, 'reject', reason);
                    }
                }}
                onCancel={() => {
                    setCancelReasonModal({
                        isOpen: false,
                        enrollId: null,
                        enrollPrice: 0,
                        clientName: '',
                        serviceTitle: ''
                    });
                }}
            />

            {/* Модальное окно создания счета */}
            <CreateAccountModal
                isOpen={isCreateAccountModalOpen}
                onClose={() => setIsCreateAccountModalOpen(false)}
                onSuccess={() => {
                    refreshUser();
                    setIsCreateAccountModalOpen(false);
                    setShowAccountRequiredModal(false);
                }}
            />

            {/* Модальное окно о необходимости счета */}
            <ConfirmModal
                isOpen={showAccountRequiredModal}
                title="Необходим счет для получения денег"
                message="Для создания услуги необходимо сначала создать счет для получения денег. Перейдите на вкладку 'Счет' и создайте его."
                confirmText="Создать счет"
                cancelText="Отмена"
                variant="warning"
                onConfirm={() => {
                    setShowAccountRequiredModal(false);
                    setActiveTab('account');
                    setIsCreateAccountModalOpen(true);
                }}
                onCancel={() => setShowAccountRequiredModal(false)}
            />
        </div>
    );
};