import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';

const priceFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
});

const statusVariants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-600'
};

export const ProfilePage: React.FC = () => {
    const { user, updateProfile } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        about: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                about: user.about || ''
            });
        }
    }, [user]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [event.target.name]: event.target.value
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
            setFeedback({ type: 'error', message: 'Имя и email обязательны' });
            return;
        }

        setIsSaving(true);
        setFeedback(null);

        try {
            await updateProfile({
                name: formData.name.trim(),
                email: formData.email.trim(),
                about: formData.about.trim() || null
            });
            setFeedback({ type: 'success', message: 'Профиль обновлён' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Не удалось сохранить изменения';
            setFeedback({ type: 'error', message });
        } finally {
            setIsSaving(false);
        }
    };

    const serviceTitleMap = useMemo(() => {
        const map = new Map<number, string>();
        user?.services?.forEach(service => {
            map.set(service.id, service.title);
        });
        return map;
    }, [user?.services]);

    const bookings = user?.services_enroll ?? [];

    const formatSlotTime = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user) {
        return null;
    }

    return (
        <div className="space-y-8">
            <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="flex flex-wrap gap-6 items-center">
                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                        {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <p className="text-sm text-gray-500 mb-1">Аккаунт</p>
                        <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex gap-8">
                        <div>
                            <p className="text-sm text-gray-500">Мои записи</p>
                            <p className="text-2xl font-semibold text-gray-900">{bookings.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Созданные услуги</p>
                            <p className="text-2xl font-semibold text-gray-900">{user.services?.length ?? 0}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr]">
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold text-gray-900">Основная информация</h2>
                        <p className="text-sm text-gray-500">Эти данные видят клиенты и мастера</p>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <Input
                                label="Имя"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <Textarea
                                label="О себе"
                                name="about"
                                value={formData.about}
                                onChange={handleChange}
                                placeholder="Расскажите коротко о себе, специализации и опыте"
                            />

                            {feedback && (
                                <div
                                    className={`rounded-lg px-4 py-3 text-sm ${
                                        feedback.type === 'success'
                                            ? 'bg-green-50 text-green-700 border border-green-100'
                                            : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}
                                >
                                    {feedback.message}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Мои записи</h2>
                                <p className="text-sm text-gray-500">
                                    {bookings.length ? 'Последние заявки на услуги' : 'Записей пока нет'}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {bookings.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                                Вы ещё не записывались на услуги. Найдите мастера на главной странице и оформите первую запись.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {bookings.map(enroll => {
                                    const title =
                                        serviceTitleMap.get(enroll.service_id) ||
                                        `Услуга #${enroll.service_id}`;
                                    const statusClass = statusVariants[enroll.status] ?? 'bg-gray-100 text-gray-600';

                                    return (
                                        <div
                                            key={enroll.id}
                                            className="border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 justify-between"
                                        >
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">{formatSlotTime(enroll.slot_time)}</p>
                                                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                                                <p className="text-sm text-gray-500">Дата записи #{enroll.service_date_id}</p>
                                            </div>
                                            <div className="text-right space-y-2">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                                    {enroll.status}
                                                </span>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {priceFormatter.format(enroll.price)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
