import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Picker} from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

import {API} from '@/api/api';
import {ThemedText} from '@/components/ThemedText';
import {ThemedView} from '@/components/ThemedView';
import {Category, ExpenseBase} from '@/types/types';
import {IconSymbol} from '@/components/ui/IconSymbol';
import {OfflineManager} from '@/services/OfflineManager';

interface AddExpenseFormProps {
    visible: boolean;
    onClose: () => void;
    onExpenseAdded: () => void;
}

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function AddExpenseForm({visible, onClose, onExpenseAdded}: AddExpenseFormProps) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [receiptImage, setReceiptImage] = useState<any>(null);
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    useEffect(() => {
        if (visible) {
            checkNetworkStatus();
            fetchCategories();
            setName('');
            setAmount('');
            setCategoryId(null);
            setDate(new Date());
            setReceiptImage(null);
        }
    }, [visible]);

    const checkNetworkStatus = async () => {
        const isOnline = await OfflineManager.isOnline();
        setIsOfflineMode(!isOnline);
    };

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            const isOnline = await OfflineManager.isOnline();

            if (isOnline) {
                const response = await API.getCategories();
                if (response && response.items) {
                    await OfflineManager.saveCategories(response.items);
                    setCategories(response.items);
                    if (response.items.length > 0) {
                        setCategoryId(response.items[0].id);
                    }
                }
            } else {
                const offlineCategories = await OfflineManager.getOfflineCategories();
                if (offlineCategories && offlineCategories.length > 0) {
                    setCategories(offlineCategories);
                    if (offlineCategories.length > 0) {
                        setCategoryId(offlineCategories[0].id);
                    }
                } else {
                    Alert.alert('Brak kategorii', 'Nie znaleziono zapisanych kategorii. Połącz się z internetem, aby pobrać kategorie.');
                }
            }
        } catch (error) {
            console.error('Błąd podczas pobierania kategorii:', error);
            try {
                const offlineCategories = await OfflineManager.getOfflineCategories();
                if (offlineCategories && offlineCategories.length > 0) {
                    setCategories(offlineCategories);
                    setCategoryId(offlineCategories[0].id);
                } else {
                    Alert.alert('Błąd', 'Nie udało się pobrać kategorii. Sprawdź połączenie z internetem.');
                }
            } catch (offlineError) {
                Alert.alert('Błąd', 'Nie udało się pobrać kategorii.');
            }
        } finally {
            setLoadingCategories(false);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const showDatepicker = () => {
        setShowDatePicker(true);
    };

    const pickImage = async () => {
        try {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Błąd', 'Potrzebujemy uprawnień do galerii, aby wybrać paragon!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setReceiptImage(result.assets[0]);
            }
        } catch (error) {
            console.error('Błąd podczas wybierania zdjęcia:', error);
            Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia');
        }
    };

    const takePhoto = async () => {
        try {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Błąd', 'Potrzebujemy uprawnień do kamery, aby zrobić zdjęcie paragonu!');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setReceiptImage(result.assets[0]);
            }
        } catch (error) {
            console.error('Błąd podczas robienia zdjęcia:', error);
            Alert.alert('Błąd', 'Nie udało się zrobić zdjęcia');
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Błąd', 'Podaj nazwę wydatku');
            return;
        }

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert('Błąd', 'Podaj poprawną kwotę');
            return;
        }

        if (!categoryId) {
            Alert.alert('Błąd', 'Wybierz kategorię');
            return;
        }

        try {
            setLoading(true);

            const expenseData: ExpenseBase = {
                name: name.trim(),
                amount: parseFloat(amount),
                category_id: categoryId,
                timestamp: formatDate(date),
                is_offline: false,
                is_public: false
            };

            const isOnline = await OfflineManager.isOnline();

            if (!isOnline) {
                await OfflineManager.saveOfflineExpense(expenseData);
                Alert.alert('Zapisano offline', 'Wydatek zostanie zsynchronizowany, gdy będzie dostępne połączenie internetowe');
                onExpenseAdded();
                onClose();
            } else {
                try {
                    await API.createExpense({
                        expense_base: expenseData,
                        image: receiptImage
                    });
                    Alert.alert('Sukces', 'Wydatek został dodany');
                    onExpenseAdded();
                    onClose();
                } catch (error: any) {
                    console.log('Error details:', error);
                    if (error.response && error.response.status === 400) {
                        Alert.alert('Błąd', 'Budżet na ten miesiąc jest za mały! Nie dodano wydatku!');
                        setLoading(false);
                        return;
                    } else {
                        throw error;
                    }
                }
            }
        } catch (error) {
            console.error('Błąd podczas dodawania wydatku:', error);
            Alert.alert('Błąd', 'Nie udało się dodać wydatku');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <ThemedView style={styles.modalContent}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <ThemedText type="title" style={styles.title}>
                            Dodaj nowy wydatek
                            {isOfflineMode &&
                                <ThemedText style={styles.offlineIndicator}> (Offline)</ThemedText>}
                        </ThemedText>

                        <ThemedText style={styles.label}>Nazwa wydatku</ThemedText>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nazwa wydatku"
                        />

                        <ThemedText style={styles.label}>Kwota (PLN)</ThemedText>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />

                        <ThemedText style={styles.label}>Data</ThemedText>
                        <TouchableOpacity onPress={showDatepicker} style={styles.dateButton}>
                            <ThemedText>{formatDate(date)}</ThemedText>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                            />
                        )}

                        <ThemedText style={styles.label}>Kategoria</ThemedText>
                        {loadingCategories ? (
                            <ActivityIndicator size="small" style={styles.loader}/>
                        ) : categories.length > 0 ? (
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={categoryId}
                                    onValueChange={(itemValue) => setCategoryId(itemValue)}
                                    style={styles.picker}
                                >
                                    {categories.map((category) => (
                                        <Picker.Item key={category.id} label={category.name}
                                                    value={category.id}/>
                                    ))}
                                </Picker>
                            </View>
                        ) : (
                            <ThemedText style={styles.noCategories}>Brak dostępnych kategorii</ThemedText>
                        )}

                        {isOfflineMode && (
                            <ThemedView style={styles.offlineWarning}>
                                <IconSymbol name="wifi.slash" size={20} color="#FF9500"/>
                                <ThemedText style={styles.offlineWarningText}>
                                    Tryb offline: wydatek zostanie zapisany na urządzeniu i zsynchronizowany
                                    później
                                </ThemedText>
                            </ThemedView>
                        )}

                        {!isOfflineMode && (
                            <>
                                <ThemedText style={styles.label}>Zdjęcie paragonu</ThemedText>
                                <View style={styles.imageContainer}>
                                    {receiptImage ? (
                                        <Image source={{uri: receiptImage.uri}} style={styles.imagePreview}/>
                                    ) : (
                                        <ThemedText style={styles.noImageText}>Brak zdjęcia</ThemedText>
                                    )}
                                    <View style={styles.imageButtons}>
                                        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                                            <ThemedText style={styles.imageButtonText}>Wybierz z
                                                galerii</ThemedText>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                                            <ThemedText style={styles.imageButtonText}>Zrób zdjęcie</ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <ThemedText style={styles.buttonText}>Anuluj</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white"/>
                                ) : (
                                    <ThemedText style={styles.buttonText}>Zapisz</ThemedText>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </ThemedView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    scrollContent: {
        paddingBottom: 20
    },
    title: {
        textAlign: 'center',
        marginBottom: 20
    },
    label: {
        marginTop: 15,
        marginBottom: 5
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: '#fff'
    },
    dateButton: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        justifyContent: 'center'
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        overflow: 'hidden'
    },
    picker: {
        height: 50
    },
    noCategories: {
        padding: 10,
        textAlign: 'center'
    },
    imageContainer: {
        marginTop: 15,
        alignItems: 'center'
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginBottom: 10
    },
    noImageText: {
        textAlign: 'center',
        marginBottom: 10
    },
    imageButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    imageButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5
    },
    imageButtonText: {
        color: 'white',
        fontWeight: 'bold'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30
    },
    saveButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        marginLeft: 10
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        marginRight: 10
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold'
    },
    loader: {
        marginVertical: 10
    },
    offlineWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        padding: 10,
        backgroundColor: '#FFF3E0',
        borderRadius: 8
    },
    offlineWarningText: {
        marginLeft: 10,
        color: '#FF9500'
    },
    offlineIndicator: {
        color: '#FF9500',
        fontWeight: 'bold'
    }
});
