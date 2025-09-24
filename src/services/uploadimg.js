const UploadImg = async(imagen) => {
    const API_KEY_IMGBB = 'f3894bdcb5d6c156e1a964105a9037ef'

    const form_data = new FormData()    
    form_data.append('image', imagen)
    try {
            const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${API_KEY_IMGBB}`,
        {
            method: 'POST',
            body: form_data
        }
        )
        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`);
        }
        const data = await response.json()
        console.log(data.data.url)
    return data.data.url
    } 
    catch (error) {
        console.error('Error al subir imagen', error)
        // throw error
        return null;
    }
}

export default UploadImg